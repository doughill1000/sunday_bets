// Rebuild the persisted credibility read model (issue #361, ADR-0032).
//
// The I/O half of the rating feature: read every settled spread decision from the
// player_rating_inputs view, run the pure fold (./computeRatings), and rebuild public.player_ratings
// from scratch. Called after each grade by src/lib/server/grading.ts, right after the stats matview
// refresh — the same post-commit, best-effort contract (ADR-0013 / ADR-0032 §8): a failure is
// logged, never thrown, and the prior snapshot self-heals on the next grade.
//
// This module is deliberately environment-agnostic — no @sentry/sveltekit import (which drags in
// SvelteKit's `$app`), and no static `$lib/supabase/service` import either (issue #619): every real
// caller (grading.ts, demo seed, prod clone, imports/backfill, vitest) already passes its own client
// explicitly, so requiring one here means this file has zero SvelteKit-virtual-module ($env/*)
// dependencies and can be imported by a plain `tsx`/`node --import tsx` script with no Vite SSR
// module-loading workaround — confirmed empirically; see scripts/rebuildRatings.ts's header for the
// failure this used to hit. The SvelteKit-only Sentry capture is injected by the grading caller via
// the `onError` hook.
import type { SupabaseClient } from '@supabase/supabase-js';
import { computePlayerRatings, type RatingDecision } from './computeRatings';

// PostgREST caps a select at 1000 rows; the full cross-group history exceeds that, so page through.
const PAGE_SIZE = 1000;

export type RebuildOptions = {
  /** Optional sink for the best-effort failure path — e.g. Sentry from the grading caller. Kept as
   *  an injected hook so this module never imports the SvelteKit-only @sentry/sveltekit itself. */
  onError?: (err: unknown) => void;
};

/** Read every rating input, paginating in a deterministic order (the fold re-sorts internally). */
async function fetchAllInputs(client: SupabaseClient): Promise<RatingDecision[]> {
  const rows: RatingDecision[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('player_rating_inputs')
      .select('group_id, user_id, season_year, commence_time, game_id, weight, outcome')
      .order('group_id', { ascending: true })
      .order('user_id', { ascending: true })
      .order('game_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as RatingDecision[];
    for (const row of page) rows.push(row);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Recompute and persist every (group, user) credibility rating.
 *
 * Full rebuild: stamps every current row with one `computed_at`, then prunes rows carrying a
 * STRICTLY OLDER stamp (a player whose settled picks were all removed, or who left the group).
 * Best-effort by design — safe to call from any settlement-writing path (grading, demo seed, prod
 * clone, imports) and idempotent. `client` is required (not defaulted) so this module never needs
 * its own import of the service-role client — callers pass the one they already constructed.
 *
 * Atomic under concurrency (#619): the upsert and prune run inside a single `_rebuild_player_ratings`
 * RPC call, i.e. one Postgres transaction serialized by a transaction-scoped advisory lock — a
 * concurrent rebuild blocks until this one fully commits, so no interleaving is possible even in
 * principle. This supersedes #622's defense-in-depth `lt` prune (kept inside the RPC as belt-and-
 * suspenders), which tolerated interleaving without emptying the table but didn't prevent it.
 */
export async function rebuildPlayerRatings(
  client: SupabaseClient,
  opts: RebuildOptions = {}
): Promise<void> {
  try {
    const inputs = await fetchAllInputs(client);
    const results = computePlayerRatings(inputs);
    const computedAt = new Date().toISOString();

    const { error } = await client.rpc('_rebuild_player_ratings', {
      p_rows: results.map((r) => ({
        group_id: r.group_id,
        user_id: r.user_id,
        rating: r.rating,
        decisions: r.decisions,
        decisions_to_qualify: r.decisionsToQualify,
        season_delta: r.seasonDelta
      })),
      p_computed_at: computedAt
    });
    if (error) throw error;
  } catch (err) {
    // Non-fatal, exactly like refreshLeaderboardStats: the grade already committed. A failed
    // rebuild leaves the prior ratings and self-heals on the next grade (ADR-0032 §8).
    opts.onError?.(err);
    console.error(
      'rebuildPlayerRatings failed (credibility ratings may be stale):',
      err instanceof Error ? err.message : String(err)
    );
  }
}

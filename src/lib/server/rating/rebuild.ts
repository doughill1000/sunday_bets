// Rebuild the persisted credibility read model (issue #361, ADR-0032).
//
// The I/O half of the rating feature: read every settled spread decision from the
// player_rating_inputs view, run the pure fold (./computeRatings), and rebuild public.player_ratings
// from scratch. Called after each grade by src/lib/server/grading.ts, right after the stats matview
// refresh — the same post-commit, best-effort contract (ADR-0013 / ADR-0032 §8): a failure is
// logged, never thrown, and the prior snapshot self-heals on the next grade.
//
// This module is deliberately environment-agnostic — no @sentry/sveltekit import (which drags in
// SvelteKit's `$app`) — so it runs unchanged in the server runtime, plain node scripts (demo seed,
// prod clone, imports), and vitest. The SvelteKit-only Sentry capture is injected by the grading
// caller via the `onError` hook.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseService } from '$lib/supabase/service';
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
 * Full rebuild: stamps every current row with one `computed_at`, then prunes any row not from this
 * run (a player whose settled picks were all removed, or who left the group). Best-effort by
 * design — safe to call from any settlement-writing path (grading, demo seed, prod clone, imports)
 * and idempotent. Pass a client for scripts that target a non-default database; defaults to the
 * service-role client the graders use.
 */
export async function rebuildPlayerRatings(
  client: SupabaseClient = supabaseService,
  opts: RebuildOptions = {}
): Promise<void> {
  try {
    const inputs = await fetchAllInputs(client);
    const results = computePlayerRatings(inputs);
    const computedAt = new Date().toISOString();

    if (results.length > 0) {
      const { error: upsertError } = await client.from('player_ratings').upsert(
        results.map((r) => ({
          group_id: r.group_id,
          user_id: r.user_id,
          rating: r.rating,
          decisions: r.decisions,
          decisions_to_qualify: r.decisionsToQualify,
          season_delta: r.seasonDelta,
          computed_at: computedAt
        })),
        { onConflict: 'group_id,user_id' }
      );
      if (upsertError) throw upsertError;
    }

    // Drop rows this rebuild did not write. Every live row carries `computedAt`; anything else is
    // stale. `neq` also clears the whole table when there are no inputs (no settled picks anywhere).
    const { error: pruneError } = await client
      .from('player_ratings')
      .delete()
      .neq('computed_at', computedAt);
    if (pruneError) throw pruneError;
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

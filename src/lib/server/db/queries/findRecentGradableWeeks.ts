import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './findActiveWeek';
import { findUnsettledGradableWeeks } from './findUnsettledGradableWeeks';

export interface FindRecentGradableWeeksOptions {
  /**
   * Drop the most-recently-concluded week candidate once it has no grading work
   * left (every non-postponed game final AND settled). Without this, a finished
   * season's final week is reselected forever (#744) because "most-recently-
   * concluded" has no end. The active-week candidate is never gated by this —
   * in-week repeated grading with refreshScores must keep working regardless.
   *
   * Leave unset for callers that need the settled week itself, e.g. the
   * weekly-recap cron: it runs hours after the grade cron has already settled
   * the week and depends on that same week still being returned so its (already
   * idempotent, per-user-deduped) push send can fire.
   */
  excludeSettledPriorWeek?: boolean;
}

/**
 * Returns the set of weeks the grade cron should process on each run.
 *
 * Collects up to two candidates:
 *   1. The currently-active week (start_ts <= now <= end_ts), if any.
 *   2. The most-recently-concluded week (greatest end_ts <= now), if any.
 *
 * Deduplicates by id so a week at its exact boundary (end_ts == now) is
 * not returned twice. Weeks are returned in no guaranteed order.
 */
export async function findRecentGradableWeeks(opts?: FindRecentGradableWeeksOptions) {
  const now = new Date().toISOString();

  const [activeWeek, priorResult] = await Promise.all([
    findActiveWeek().catch(() => null),
    supabaseService
      .from('weeks')
      .select('*')
      .lte('end_ts', now)
      .order('end_ts', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const { data: priorWeek, error: priorError } = priorResult;
  if (priorError) throw priorError;

  let priorCandidate = priorWeek ?? null;
  if (
    opts?.excludeSettledPriorWeek &&
    priorCandidate !== null &&
    priorCandidate.id !== activeWeek?.id &&
    (await isWeekFullySettled(priorCandidate.id))
  ) {
    priorCandidate = null;
  }

  const candidates = [activeWeek, priorCandidate];
  const seen = new Set<number>();
  const result: NonNullable<typeof activeWeek>[] = [];

  for (const week of candidates) {
    if (week !== null && !seen.has(week.id)) {
      seen.add(week.id);
      result.push(week);
    }
  }

  return result;
}

/**
 * A week has no grading work left once every non-postponed game is final AND no final game is
 * still owed a settlement.
 *
 * The "still owed" half defers to `find_unsettled_weeks()` — the reconcile sweep's own
 * predicate — rather than re-deriving it here. This used to be a hand-rolled mirror ("every
 * final game has at least one pick_settlement row"), and ADR-0037 made that mirror wrong:
 * under the participation boundary a game can legitimately owe ZERO rows (a league created
 * after it was played), so the row-presence test would keep reporting the week unsettled
 * forever and the #744 gate would never release it (#724). The SQL function now carries the
 * boundary via `_settlement_owed`, and calling it means the cron gate and the sweep cannot
 * drift again.
 *
 * `advance_week_if_complete()` is still not called directly: it always targets the single
 * globally most-recently-concluded week, not an arbitrary id.
 */
async function isWeekFullySettled(weekId: number): Promise<boolean> {
  const { data: games, error: gamesError } = await supabaseService
    .from('games')
    .select('id, final_scores')
    .eq('week_id', weekId)
    .neq('status', 'postponed');
  if (gamesError) throw gamesError;

  const rows = games ?? [];
  const finalGameIds = rows.filter((g) => isFinalScore(g.final_scores)).map((g) => g.id);

  // Some non-postponed game isn't final yet — refreshScores still has work to do.
  if (finalGameIds.length !== rows.length) return false;
  if (finalGameIds.length === 0) return true;

  const unsettled = await findUnsettledGradableWeeks();
  return !unsettled.some((w) => w.id === weekId);
}

function isFinalScore(finalScores: unknown): boolean {
  return (
    typeof finalScores === 'object' &&
    finalScores !== null &&
    (finalScores as { home?: unknown }).home != null
  );
}

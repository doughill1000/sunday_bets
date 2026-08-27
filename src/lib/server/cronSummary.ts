// Read the best-effort read-model outcomes back out of a cron run's own summary JSON (#623).
//
// The grade cron's post-grade refreshes (leaderboard/stats matviews, credibility ratings) are
// deliberately best-effort: a failure is logged and never fails the grade (ADR-0013, ADR-0032 §8).
// The consequence is that "the grade cron is green" does NOT imply "the read models are fresh" —
// the job returns 200 with `ok = true` in cron_run_log even when both refreshes failed. The cron
// now records each step's outcome in its summary; this reads it back so /admin can say so.
//
// Deliberately defensive: `cron_run_log.summary` is untyped `jsonb` written by several jobs, and
// every row predating #623 has no `readModels` key at all. Anything unrecognized reads as "no
// degradation" rather than throwing on the admin page.
import type { Json } from '$lib/types/supabase';

/** Operator-facing labels for the two whole-table read models a grade invalidates. */
const READ_MODEL_LABELS: Record<string, string> = {
  leaderboardStats: 'leaderboard/stats matviews',
  playerRatings: 'credibility ratings'
};

function asRecord(value: Json | null | undefined): Record<string, Json> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null;
}

/**
 * Name the read models a cron run failed to refresh, in the order they run.
 *
 * Empty means either "everything refreshed" or "this run doesn't report read models" — both are
 * non-degraded as far as the admin card is concerned.
 */
export function staleReadModels(summary: Json | null): string[] {
  const readModels = asRecord(asRecord(summary)?.readModels);
  if (!readModels) return [];

  return Object.entries(READ_MODEL_LABELS)
    .filter(([key]) => asRecord(readModels[key])?.ok === false)
    .map(([, label]) => label);
}

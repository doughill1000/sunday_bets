// Pure derivations over the season trend (stats_season_trend) for the League home (#561):
// the season race chart's "is there anything to race yet" gate, and each player's rank movement
// between the two most-recent graded weeks. Kept pure and DOM-free so the ordering/edge cases are
// unit-tested without a component. The trend carries one row per player per *graded* week, so its
// mere presence answers "has a week been graded".
import type { SeasonTrendEntry } from '$lib/types/server/stats';

/** True once at least one week of this season has been graded — the race chart's show gate. */
export function hasGradedWeek(trend: SeasonTrendEntry[]): boolean {
  return trend.length > 0;
}

/**
 * Each player's standings-rank change between the two most-recent graded weeks, keyed by
 * `user_id`. The value is `previousRank − currentRank`, so **positive = climbed** (rank number
 * went down), negative = slipped, 0 = held. A player is absent from the map when they have no
 * rank in *both* weeks (joined mid-season, or the season has only one graded week) — the
 * standings render those as a neutral dash rather than a fabricated "no change".
 *
 * Ranks come straight from `cumulative_rank_this_week`, which the leaderboard already computes;
 * this only diffs the latest two graded weeks it carries.
 */
export function rankMovements(trend: SeasonTrendEntry[]): Map<string, number> {
  const weeks = [...new Set(trend.map((r) => r.week_number))].sort((a, b) => a - b);
  const movements = new Map<string, number>();
  if (weeks.length < 2) return movements;

  const currentWeek = weeks[weeks.length - 1];
  const previousWeek = weeks[weeks.length - 2];
  const currentRank = new Map<string, number>();
  const previousRank = new Map<string, number>();
  for (const row of trend) {
    if (row.week_number === currentWeek)
      currentRank.set(row.user_id, row.cumulative_rank_this_week);
    else if (row.week_number === previousWeek)
      previousRank.set(row.user_id, row.cumulative_rank_this_week);
  }

  for (const [userId, curr] of currentRank) {
    const prev = previousRank.get(userId);
    if (prev == null) continue; // no rank last week → neutral dash (absent from the map)
    movements.set(userId, prev - curr);
  }
  return movements;
}

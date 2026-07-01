// Mirrors the per-weight points used by SQL grading (grade_pick / pick_settlement).
// Keep in sync with the DB scoring preset — see docs/adr/0007-line-and-lock-grading-preset.md.
import type { WeightCode } from '$lib/types/domain';

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low', points: 1 },
  M: { label: 'Medium', points: 3 },
  H: { label: 'High', points: 5 },
  A: { label: 'All-In', points: 10 }
};

export function weightLabel(weight: WeightCode): string {
  return WEIGHTS[weight].label;
}

export function weightPoints(weight: WeightCode): number {
  return WEIGHTS[weight].points;
}

/** The drop-worst-week fields carried inside group_config.scoring_rules (ADR-0018). */
export type DropWorstWeekRules = {
  drop_worst_week?: boolean | null;
  drop_worst_week_start_year?: number | null;
} | null;

/**
 * Is drop-worst-week active for a specific (group, season)? Mirrors the SQL predicate
 * inlined in leaderboard_season_totals.sql / stats_alltime_totals.sql /
 * stats_season_trend.sql (ADR-0018) — keep the three-part condition textually in sync:
 * enabled, a start year is set, and this season is at or after it (non-retroactive).
 */
export function isDropWorstWeekActive(rules: DropWorstWeekRules, seasonYear: number): boolean {
  const startYear = rules?.drop_worst_week_start_year;
  return Boolean(rules?.drop_worst_week) && startYear != null && seasonYear >= startYear;
}

/**
 * Is the rule enabled at the group level, independent of any one season? True once a
 * commissioner has both toggled it on and committed to a start year. Used for the
 * cross-season Career caption, where no single season scopes the explanation.
 */
export function isDropWorstWeekEnabled(rules: DropWorstWeekRules): boolean {
  return Boolean(rules?.drop_worst_week) && rules?.drop_worst_week_start_year != null;
}

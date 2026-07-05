// Mirrors the per-weight points used by SQL grading (grade_pick / pick_settlement)
// and the drop-worst-week predicate — port of the web app's src/lib/domain/scoring.ts.
// Keep in sync with the DB scoring preset (ADR-0007) and ADR-0018.
import type { WeightCode } from './types';

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low', points: 1 },
  M: { label: 'Medium', points: 3 },
  H: { label: 'High', points: 5 },
  A: { label: 'All-In', points: 10 }
};

/** Board display order for the weight chips. */
export const WEIGHT_ORDER: WeightCode[] = ['L', 'M', 'H', 'A'];

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
 * inlined in leaderboard_season_totals.sql (ADR-0018): enabled, a start year is set,
 * and this season is at or after it (non-retroactive by construction).
 */
export function isDropWorstWeekActive(rules: DropWorstWeekRules, seasonYear: number): boolean {
  const startYear = rules?.drop_worst_week_start_year;
  return Boolean(rules?.drop_worst_week) && startYear != null && seasonYear >= startYear;
}

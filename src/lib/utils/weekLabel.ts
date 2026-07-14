import type { SeasonWeekOption } from '$lib/types/leaderboard';

/**
 * Human label for a week option. Preseason rounds are stored as negative `week_number`
 * (ADR-0016), so they label as "Preseason N" rather than the literal "Week -1".
 *
 * Extracted from WeeklyPicksBreakdown in #631: the League Week tab now labels the same
 * week in three places (the navigator, the page subtitle, and the recap link), and those
 * must not drift apart on the preseason case.
 */
export function weekLabel(w: SeasonWeekOption | null): string {
  if (w == null) return 'No weeks started';
  return w.weekNumber < 0 ? `Preseason ${-w.weekNumber}` : `Week ${w.weekNumber}`;
}

import { supabaseService } from '$lib/supabase/service';

export interface UpcomingWeek {
  /** NFL week number (negative for preseason, ADR-0016). */
  weekNumber: number;
  /** ISO start_ts — the value passed to create_group / set_competition_start as the boundary. */
  startTs: string;
}

/**
 * Weeks that have not started yet, soonest first — the "choose a future week" options for the
 * ADR-0037 competition-start controls (league creation and the commissioner console).
 *
 * A week's `start_ts` is compared directly against `games.commence_time` by the grading
 * boundary, so it is exactly the value a creator/commissioner sets to "start from week N". We
 * deliberately DON'T filter by season: only the current/next season's weeks are still in the
 * future (every historical season's weeks are in the past), so `start_ts > now` selects the
 * right ones on its own. The current, already-started week is intentionally excluded — that is
 * the "start this week, from now" default, which needs no explicit start value.
 */
export async function getUpcomingWeeks(): Promise<UpcomingWeek[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('week_number, start_ts')
    .gt('start_ts', now)
    .order('start_ts', { ascending: true })
    .limit(24);

  if (error) throw error;

  return (data ?? []).map((w) => ({ weekNumber: w.week_number, startTs: w.start_ts }));
}

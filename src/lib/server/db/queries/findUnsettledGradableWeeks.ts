import { supabaseService } from '$lib/supabase/service';

/**
 * Returns the weeks the grade cron's reconcile sweep should settle (#433).
 *
 * These are weeks that have at least one game with a final score but no pick_settlement
 * row — a week stranded because it was missed during the cron's normal processing window
 * (findRecentGradableWeeks only ever looks at the active + most-recently-concluded week).
 *
 * The underlying find_unsettled_weeks() SQL fn returns a true no-op once a week is
 * settled and excludes frozen (grading_locked) seasons, so the sweep is safe to run on
 * every tick. Callers must settle these weeks WITHOUT the recap/AI/push/Wrapped fan-out,
 * which stays scoped to genuinely-recent weeks.
 */
export async function findUnsettledGradableWeeks(): Promise<{ id: number }[]> {
  const { data, error } = await supabaseService.rpc('find_unsettled_weeks');
  if (error) throw error;
  return data ?? [];
}

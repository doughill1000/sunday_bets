import { supabaseService } from '$lib/supabase/service';

/**
 * A season counts as "in progress" while it still has a scoring week that hasn't
 * concluded (`end_ts` in the future) — whether that week is live right now or yet to
 * kick off. Once every scoring week has ended, the season reads as complete even
 * though `seasons`/`current_season_year` may still name it the newest row: that view
 * is `max(year)`, seeded by Schedule Sync before a single game is played, so it can't
 * distinguish "season starting soon" from "season over months ago" (see the docstring
 * on `resolveSeasonYear` in `seasonDefault.ts` for the same pitfall).
 */
export async function isSeasonInProgress(seasonYear: number): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('id, seasons!inner(year)')
    .eq('seasons.year', seasonYear)
    .eq('is_scoring', true)
    .gte('end_ts', now)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { getGameplaySettings } from '$lib/server/admin';
import { supabaseService } from '$lib/supabase/service';

async function isLastWeekOfSeason(weekNumber: number, seasonId: number): Promise<boolean> {
  const { data } = await supabaseService
    .from('weeks')
    .select('week_number')
    .eq('season_id', seasonId)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.week_number === weekNumber;
}

export const load: PageServerLoad = async (event) => {
  const { session } = await event.locals.safeGetSession();
  const userId = session?.user.id ?? null;

  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  const week = await findActiveWeek();
  if (!week)
    return {
      week: null,
      games: [],
      picks: {},
      groupPicks: [],
      userId,
      isLastWeek: false,
      finalWeekUnlimitedAllin: true
    };

  const [games, picks, groupPicks, gameplay, lastWeek] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId),
    getGroupPicks(event, week.id, groupId),
    getGameplaySettings(),
    isLastWeekOfSeason(week.week_number, week.season_id)
  ]);

  return {
    week,
    games,
    picks,
    groupPicks,
    userId,
    isLastWeek: lastWeek,
    finalWeekUnlimitedAllin: gameplay.finalWeekUnlimitedAllin
  };
};

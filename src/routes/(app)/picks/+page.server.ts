import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getCommentsForGame } from '$lib/server/db/queries/getCommentsForGame';
import { getReactionsForGame } from '$lib/server/db/queries/getReactionsForGame';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { getGameplaySettings } from '$lib/server/admin';
import { kickoffPassed } from '$lib/domain/rules';
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

  const displayNameResult = userId
    ? await event.locals.supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()
    : null;
  const currentUserDisplayName = displayNameResult?.data?.display_name ?? null;

  const week = await findActiveWeek();
  if (!week)
    return {
      week: null,
      games: [],
      picks: {},
      social: {},
      groupPicks: [],
      userId,
      currentUserDisplayName,
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

  // Load comments and reactions for started games only (RLS also enforces this gate).
  const now = Date.now();
  const startedGameIds = games.filter((g) => kickoffPassed(g.kickoff, now)).map((g) => g.id);

  const socialEntries = await Promise.all(
    startedGameIds.map(async (gameId) => {
      const [comments, reactions] = await Promise.all([
        getCommentsForGame(event, groupId, gameId),
        getReactionsForGame(event, groupId, gameId)
      ]);
      return [gameId, { comments, reactions }] as const;
    })
  );
  const social = Object.fromEntries(socialEntries);

  return {
    week,
    games,
    picks,
    social,
    groupPicks,
    userId,
    currentUserDisplayName,
    isLastWeek: lastWeek,
    finalWeekUnlimitedAllin: gameplay.finalWeekUnlimitedAllin
  };
};

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getCommentsForGames } from '$lib/server/db/queries/getCommentsForGame';
import { getReactionsForGames } from '$lib/server/db/queries/getReactionsForGame';
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

  const { groupId, memberships } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');
  const membershipCount = memberships.length;

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
      finalWeekUnlimitedAllin: true,
      membershipCount
    };

  const [games, picks, groupPicks, gameplay, lastWeek] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId),
    getGroupPicks(event, week.id, groupId),
    getGameplaySettings(),
    isLastWeekOfSeason(week.week_number, week.season_id)
  ]);

  // Load comments and reactions for started games only (RLS also enforces this gate).
  // Two batched queries (one per table) instead of a per-game N+1.
  const now = Date.now();
  const startedGameIds = games.filter((g) => kickoffPassed(g.kickoff, now)).map((g) => g.id);

  const [commentsByGame, reactionsByGame] = await Promise.all([
    getCommentsForGames(event, groupId, startedGameIds),
    getReactionsForGames(event, groupId, startedGameIds)
  ]);
  const social = Object.fromEntries(
    startedGameIds.map((gameId) => [
      gameId,
      {
        comments: commentsByGame.get(gameId) ?? [],
        reactions: reactionsByGame.get(gameId) ?? []
      }
    ])
  );

  return {
    week,
    games,
    picks,
    social,
    groupPicks,
    userId,
    currentUserDisplayName,
    isLastWeek: lastWeek,
    finalWeekUnlimitedAllin: gameplay.finalWeekUnlimitedAllin,
    membershipCount
  };
};

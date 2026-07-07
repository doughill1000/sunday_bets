import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getCommentsForGames } from '$lib/server/db/queries/getCommentsForGame';
import { getReactionsForGames } from '$lib/server/db/queries/getReactionsForGame';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { getAllInDeclarations } from '$lib/server/db/queries/getAllInDeclarations';
import { getPicksStatusBoard } from '$lib/server/db/queries/getPicksStatusBoard';
import { getLeagueSituational } from '$lib/server/db/queries/league';
import type { LeagueSituationalRecord } from '$lib/types/server/league';
import { getGameplaySettings } from '$lib/server/admin';
import { kickoffPassed } from '$lib/domain/rules';
import { supabaseService } from '$lib/supabase/service';
import { tracePageLoad } from '$lib/server/observability';

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

  return tracePageLoad('picks', () => loadPicks(event, groupId, userId, memberships));
};

async function loadPicks(
  event: Parameters<PageServerLoad>[0],
  groupId: string,
  userId: string | null,
  memberships: App.Locals['memberships']
) {
  const membershipCount = memberships.length;

  // Per-user opt-out (default on) for the pick-card ATS trend nugget (issue #406 PR 2).
  // Rides the cached users profile, so it's read straight off locals — no extra query.
  const showTrends = event.locals.userProfile?.showTeamTrends ?? true;

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
      allInDeclarations: [],
      pickStatusBoard: [],
      userId,
      currentUserDisplayName,
      isLastWeek: false,
      finalWeekUnlimitedAllin: true,
      membershipCount,
      situational: [] as LeagueSituationalRecord[],
      showTrends
    };

  const [
    games,
    picks,
    groupPicks,
    allInDeclarations,
    pickStatusBoard,
    gameplay,
    lastWeek,
    situational
  ] = await Promise.all([
    getActiveWeekGames(),
    getMyPicks(event, week.id, groupId),
    getGroupPicks(event, week.id, groupId),
    getAllInDeclarations(event, week.id, groupId),
    getPicksStatusBoard(event, week.id, groupId),
    getGameplaySettings(),
    isLastWeekOfSeason(week.week_number, week.season_id),
    // Season-scoped, group-independent; only fetched when the nugget is enabled.
    showTrends
      ? event.locals.getCurrentSeasonYear().then((year) => getLeagueSituational(year))
      : Promise.resolve<LeagueSituationalRecord[]>([])
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
    allInDeclarations,
    pickStatusBoard,
    userId,
    currentUserDisplayName,
    isLastWeek: lastWeek,
    finalWeekUnlimitedAllin: gameplay.finalWeekUnlimitedAllin,
    membershipCount,
    situational,
    showTrends
  };
}

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGamesWithActiveLines } from '$lib/server/db/queries/getGamesWithActiveLines';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getCommentsForGames } from '$lib/server/db/queries/getCommentsForGame';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { getAllInDeclarations } from '$lib/server/db/queries/getAllInDeclarations';
import { getPicksStatusBoard } from '$lib/server/db/queries/getPicksStatusBoard';
import { getLeagueSituational } from '$lib/server/db/queries/league';
import type { LeagueSituationalRecord } from '$lib/types/server/league';
import type { PickGame } from '$lib/types/games';
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

// Comments for started games only (RLS also enforces this gate). Depends only on
// the games, so the caller chains it off the games promise to overlap the other
// per-week reads rather than running it as a second serial wave.
async function loadSocial(
  event: Parameters<PageServerLoad>[0],
  groupId: string,
  games: PickGame[]
) {
  const now = Date.now();
  const startedGameIds = games.filter((g) => kickoffPassed(g.kickoff, now)).map((g) => g.id);

  const commentsByGame = await getCommentsForGames(event, groupId, startedGameIds);

  return Object.fromEntries(
    startedGameIds.map((gameId) => [gameId, { comments: commentsByGame.get(gameId) ?? [] }])
  );
}

export const load: PageServerLoad = async (event) => {
  const { session } = await event.locals.safeGetSession();
  const userId = session?.user.id ?? null;

  const { groupId, memberships } = event.locals;
  if (!groupId) throw redirect(303, '/join');

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

  // Display name also rides the ADR-0014-cached users profile (hooks.server.ts) —
  // no extra round-trip. Empty string (no name set) collapses to null to preserve
  // the previous query's contract.
  const currentUserDisplayName = event.locals.userProfile?.displayName || null;

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

  // Games resolve as their own promise: everything week-scoped needs `week.id`, and
  // the social fetch needs the resolved games. Chaining social off the games promise
  // lets it overlap the other per-week reads in a single Promise.all wave instead of
  // running as a second serial round-trip after them. (We already have `week` from
  // findActiveWeek, so read games directly rather than re-resolving the week via
  // getActiveWeekGames.)
  const gamesPromise = getGamesWithActiveLines(week.id);
  const socialPromise = gamesPromise.then((games) => loadSocial(event, groupId, games));

  const [
    games,
    picks,
    groupPicks,
    allInDeclarations,
    pickStatusBoard,
    gameplay,
    lastWeek,
    situational,
    social
  ] = await Promise.all([
    gamesPromise,
    getMyPicks(event, week.id, groupId),
    getGroupPicks(event, week.id, groupId),
    getAllInDeclarations(event, week.id, groupId),
    getPicksStatusBoard(event, week.id, groupId),
    getGameplaySettings(),
    isLastWeekOfSeason(week.week_number, week.season_id),
    // Season-scoped, group-independent; only fetched when the nugget is enabled.
    showTrends
      ? event.locals.getCurrentSeasonYear().then((year) => getLeagueSituational(year))
      : Promise.resolve<LeagueSituationalRecord[]>([]),
    socialPromise
  ]);

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

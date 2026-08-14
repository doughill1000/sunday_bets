import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGamesWithActiveLines } from '$lib/server/db/queries/getGamesWithActiveLines';
import { getFinalScoresForWeek } from '$lib/server/db/queries/getFinalScoresForWeek';
import { getMySettlements } from '$lib/server/db/queries/getMySettlements';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';
import { getAllInDeclarations } from '$lib/server/db/queries/getAllInDeclarations';
import { getPicksStatusBoard } from '$lib/server/db/queries/getPicksStatusBoard';
import { getLeagueSituational } from '$lib/server/db/queries/league';
import type { LeagueSituationalRecord } from '$lib/types/server/league';
import { getGameplaySettings } from '$lib/server/admin';
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

  const week = await findActiveWeek();
  if (!week)
    return {
      week: null,
      games: [],
      picks: {},
      allInDeclarations: [],
      pickStatusBoard: [],
      userId,
      isLastWeek: false,
      finalWeekUnlimitedAllin: true,
      membershipCount,
      situational: [] as LeagueSituationalRecord[],
      showTrends
    };

  // Games resolve as their own promise because the settlement read needs the week's game ids.
  // Chaining it off the games promise keeps it inside the single Promise.all wave rather than
  // running as a second serial round-trip. (We already have `week` from findActiveWeek, so read
  // games directly rather than re-resolving the week via getActiveWeekGames.)
  //
  // These two reads replace the comments + reactions pair this load used to await
  // sequentially, outside the wave — a waterfall on the app's highest-frequency arrival, the
  // pick-reminder push (#832). Both are ordinary DB reads: the page adds no ESPN call, and with
  // the sweat board gone it makes none at all.
  const gamesPromise = getGamesWithActiveLines(week.id);
  const finalScoresPromise = getFinalScoresForWeek(week.id);
  const settlementsPromise = gamesPromise.then((games) =>
    getMySettlements(
      games.map((g) => g.id),
      groupId,
      userId
    )
  );

  const [
    baseGames,
    basePicks,
    allInDeclarations,
    pickStatusBoard,
    gameplay,
    lastWeek,
    situational,
    finalScores,
    settlements
  ] = await Promise.all([
    gamesPromise,
    getMyPicks(event, week.id, groupId),
    getAllInDeclarations(event, week.id, groupId),
    getPicksStatusBoard(event, week.id, groupId),
    getGameplaySettings(),
    isLastWeekOfSeason(week.week_number, week.season_id),
    // Season-scoped, group-independent; only fetched when the nugget is enabled.
    showTrends
      ? event.locals.getCurrentSeasonYear().then((year) => getLeagueSituational(year))
      : Promise.resolve<LeagueSituationalRecord[]>([]),
    finalScoresPromise,
    settlementsPromise
  ]);

  const games = baseGames.map((g) => ({ ...g, finalScores: finalScores[g.id] ?? null }));

  // Merge the settled outcome onto my pick entry. A settlement can exist without a pick — that
  // is exactly what `'missed'` is — so iterate the settlements too rather than only decorating
  // rows `getMyPicks` already returned, or a missed game would silently keep no outcome and the
  // handoff strip would fall back to its heuristic on a game grading has already ruled on.
  const picks = { ...basePicks };
  for (const [gameId, settlement] of Object.entries(settlements)) {
    picks[gameId] = {
      ...picks[gameId],
      outcome: settlement.outcome,
      pointsDelta: settlement.pointsDelta
    };
  }

  return {
    week,
    games,
    picks,
    allInDeclarations,
    pickStatusBoard,
    userId,
    isLastWeek: lastWeek,
    finalWeekUnlimitedAllin: gameplay.finalWeekUnlimitedAllin,
    membershipCount,
    situational,
    showTrends
  };
}

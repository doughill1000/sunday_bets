import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getAvailableSeasons
} from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason, getAllTimeStats } from '$lib/server/db/queries/stats';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  return tracePageLoad('stats', () => loadStats(event, groupId));
};

async function loadStats(event: Parameters<PageServerLoad>[0], groupId: string) {
  const [currentSeasonYear, { data: auth }] = await Promise.all([
    getCurrentSeasonYear(),
    event.locals.supabase.auth.getUser()
  ]);

  const rawSeason = event.url.searchParams.get('season');
  const seasonYear = rawSeason ? parseInt(rawSeason, 10) || currentSeasonYear : currentSeasonYear;

  const [availableSeasons, allTimeStats, stats, totals] = await Promise.all([
    getAvailableSeasons(groupId),
    getAllTimeStats(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  return {
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    currentUserId: auth?.user?.id ?? null,
    totals,
    allTimeTotals: allTimeStats.allTimeTotals,
    allTimeTeamAccuracy: allTimeStats.allTimeTeamAccuracy,
    allTimeWeightAccuracy: allTimeStats.allTimeWeightAccuracy,
    ...stats
  };
}

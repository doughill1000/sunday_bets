import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getAvailableSeasons
} from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason, getAllTimeStats } from '$lib/server/db/queries/stats';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)

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
};

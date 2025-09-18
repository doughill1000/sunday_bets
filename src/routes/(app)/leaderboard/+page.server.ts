import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getWeeklyCumulative
} from '$lib/server/db/queries/leaderboard';
import { getWeeklyTable } from '$lib/server/leaderboard';

export const load: PageServerLoad = async () => {
  const seasonYear = await getCurrentSeasonYear();
  const [totals, weekly, table] = await Promise.all([
    getSeasonLeaderboard(seasonYear),
    getWeeklyCumulative(seasonYear),
    getWeeklyTable(seasonYear)
  ]);

  return {
    seasonYear,
    totals,
    weekly,
    players: table.players,
    weeks: table.weeks,
    tableByWeek: table.tableByWeek,
    weekTotals: table.weekTotals ?? {}
  };
};

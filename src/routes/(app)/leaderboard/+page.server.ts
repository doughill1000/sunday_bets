import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getWeeklyCumulative
} from '$lib/server/db/queries/leaderboard';
import { getWeeklyTable } from '$lib/server/leaderboard';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek'; // added

export const load: PageServerLoad = async () => {
  const seasonYear = await getCurrentSeasonYear();
  const [totals, weekly, table, activeWeekRow] = await Promise.all([
    getSeasonLeaderboard(seasonYear),
    getWeeklyCumulative(seasonYear),
    getWeeklyTable(seasonYear),
    findActiveWeek()
  ]);

  const activeWeekNumber = activeWeekRow?.week_number ?? null;

  let weeksOrdered = table.weeks;
  if (activeWeekNumber != null) {
    const future = weeksOrdered.filter((w) => w > activeWeekNumber).sort((a, b) => a - b);
    const past = weeksOrdered.filter((w) => w < activeWeekNumber).sort((a, b) => a - b);
    weeksOrdered = [activeWeekNumber, ...future, ...past];
  }

  return {
    seasonYear,
    totals,
    weekly,
    players: table.players,
    weeks: weeksOrdered,
    tableByWeek: table.tableByWeek,
    weekTotals: table.weekTotals ?? {}
  };
};

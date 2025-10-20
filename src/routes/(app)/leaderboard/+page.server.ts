import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getWeeklyCumulative
} from '$lib/server/db/queries/leaderboard';
import { getWeeklyTable } from '$lib/server/leaderboard';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';

export const load: PageServerLoad = async (event) => {
  const seasonYear = await getCurrentSeasonYear();
  const [{ data: auth }, totals, weekly, table, activeWeekRow] = await Promise.all([
    event.locals.supabase.auth.getUser(),
    getSeasonLeaderboard(seasonYear),
    getWeeklyCumulative(seasonYear),
    getWeeklyTable(seasonYear),
    findActiveWeek()
  ]);

  const activeWeekNumber = activeWeekRow?.week_number ?? null;

  const nonPreseasonWeeks = table.weeks.filter((w) => w >= 0);

  // Show only active + prior weeks (hide future weeks)
  let weeksOrdered: number[];
  if (activeWeekNumber != null) {
    const prior = nonPreseasonWeeks
      .filter((w) => w < activeWeekNumber)
      .sort((a, b) => b - a); // descending prior weeks
    weeksOrdered = [activeWeekNumber, ...prior];
  } else {
    // If no active week, just show all non-preseason weeks descending
    weeksOrdered = [...nonPreseasonWeeks].sort((a, b) => b - a);
  }

  // Restrict tableByWeek and weekTotals to visible weeks
  const visibleWeekSet = new Set(weeksOrdered);
  const filteredTableByWeek = Object.fromEntries(
    Object.entries(table.tableByWeek).filter(([wk]) => visibleWeekSet.has(Number(wk)))
  );
  const filteredWeekTotals = Object.fromEntries(
    Object.entries(table.weekTotals ?? {}).filter(([wk]) => visibleWeekSet.has(Number(wk)))
  );

  return {
    seasonYear,
    totals,
    weekly,
    players: table.players,
    weeks: weeksOrdered,
    activeWeekNumber,
    tableByWeek: filteredTableByWeek,
    weekTotals: filteredWeekTotals,
    currentUserId: auth?.user?.id ?? null
  };
};

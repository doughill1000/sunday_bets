import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboardPage,
  getAvailableSeasons
} from '$lib/server/db/queries/leaderboard';
import { getReigningChampion } from '$lib/server/db/queries/honors';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  return tracePageLoad('leaderboard', () => loadLeaderboard(event, groupId));
};

async function loadLeaderboard(event: Parameters<PageServerLoad>[0], groupId: string) {
  const view = event.url.searchParams.get('view') ?? 'standings';
  const weekParam = event.url.searchParams.get('week');
  const cursor = event.url.searchParams.get('cursor');

  const [currentSeasonYear, availableSeasons] = await Promise.all([
    getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const rawSeason = event.url.searchParams.get('season');
  const seasonYear = rawSeason ? parseInt(rawSeason, 10) || currentSeasonYear : currentSeasonYear;

  const [{ data: auth }, page, champion] = await Promise.all([
    event.locals.supabase.auth.getUser(),
    getSeasonLeaderboardPage(seasonYear, groupId, { cursor }),
    getReigningChampion(groupId)
  ]);

  const currentUserId = auth?.user?.id ?? null;
  // Crown only shown when viewing the current in-progress season.
  const championUserId = seasonYear === currentSeasonYear ? (champion?.user_id ?? null) : null;
  const totals = page.entries;
  const totalsCursor = page.nextCursor;

  if (view !== 'weekly') {
    return {
      currentSeasonYear,
      seasonYear,
      availableSeasons,
      totals,
      totalsCursor,
      currentUserId,
      championUserId,
      view: 'standings' as const,
      weeks: null,
      selectedWeek: null,
      breakdown: null
    };
  }

  const weeks = await getSeasonWeekOptions(seasonYear);
  const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const selectedWeekNumber =
    weekParam != null ? Number(weekParam) : (latestWeek?.weekNumber ?? null);
  const selectedWeek = weeks.find((w) => w.weekNumber === selectedWeekNumber) ?? latestWeek;

  const breakdown =
    selectedWeek != null
      ? await getWeeklyPickBreakdown(event, selectedWeek.weekId, groupId, currentUserId)
      : [];

  return {
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    totals,
    totalsCursor,
    currentUserId,
    championUserId,
    view: 'weekly' as const,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
}

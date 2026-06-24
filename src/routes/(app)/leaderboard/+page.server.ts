import type { PageServerLoad } from './$types';
import { getCurrentSeasonYear, getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const view = event.url.searchParams.get('view') ?? 'standings';
  const weekParam = event.url.searchParams.get('week');

  const seasonYear = await getCurrentSeasonYear();
  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)

  const [{ data: auth }, totals] = await Promise.all([
    event.locals.supabase.auth.getUser(),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  const currentUserId = auth?.user?.id ?? null;

  if (view !== 'weekly') {
    return {
      seasonYear,
      totals,
      currentUserId,
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
    seasonYear,
    totals,
    currentUserId,
    view: 'weekly' as const,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
};

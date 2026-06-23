import type { PageServerLoad } from './$types';
import { getCurrentSeasonYear, getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

export const load: PageServerLoad = async (event) => {
  const seasonYear = await getCurrentSeasonYear();
  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (issue #102)
  const [{ data: auth }, stats, totals] = await Promise.all([
    event.locals.supabase.auth.getUser(),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  return { seasonYear, currentUserId: auth?.user?.id ?? null, totals, ...stats };
};

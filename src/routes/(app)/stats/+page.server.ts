import type { PageServerLoad } from './$types';
import { getCurrentSeasonYear, getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';

export const load: PageServerLoad = async (event) => {
  const seasonYear = await getCurrentSeasonYear();
  const [{ data: auth }, stats, totals] = await Promise.all([
    event.locals.supabase.auth.getUser(),
    getStatsForSeason(seasonYear),
    getSeasonLeaderboard(seasonYear)
  ]);

  return { seasonYear, currentUserId: auth?.user?.id ?? null, totals, ...stats };
};

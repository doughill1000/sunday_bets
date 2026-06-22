import type { PageServerLoad } from './$types';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';

export const load: PageServerLoad = async () => {
  const seasonYear = await getCurrentSeasonYear();
  const stats = await getStatsForSeason(seasonYear);

  return { seasonYear, ...stats };
};

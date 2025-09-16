import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getWeeklyCumulative
} from '$lib/server/db/queries/leaderboard';

export const load: PageServerLoad = async () => {
  const seasonYear = await getCurrentSeasonYear();
  const [totals, weekly] = await Promise.all([
    getSeasonLeaderboard(seasonYear),
    getWeeklyCumulative(seasonYear)
  ]);

  return {
    seasonYear,
    totals,
    weekly
  };
};

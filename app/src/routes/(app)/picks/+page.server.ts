import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek, getMyPicks } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {} };

  const [games, userPicks] = await Promise.all([getActiveWeekGames(), getMyPicks(event, week.id)]);


  return { week, games, userPicks };
};

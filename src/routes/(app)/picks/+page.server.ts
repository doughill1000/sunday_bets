import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { findActiveWeek } from '$lib/server/db/queries/findActiveWeek';
import { getMyPicks } from '$lib/server/db/queries/getMyPicks';

export const load: PageServerLoad = async (event) => {
  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {} };

  const [games, picks] = await Promise.all([getActiveWeekGames(), getMyPicks(event, week.id)]);

  return { week, games, picks };
};

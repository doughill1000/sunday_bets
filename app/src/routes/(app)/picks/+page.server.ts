// +page.server.ts
import type { PageServerLoad } from './$types';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { toUIGamesFromDb } from '$lib/adapters/games';
import { toPickEntries } from '$lib/adapters/picks';
import { findActiveWeek, getMyPicks } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
  const week = await findActiveWeek();
  if (!week) return { week: null, games: [], picks: {} };

  const [dbRows, myPicks] = await Promise.all([getActiveWeekGames(), getMyPicks(event, week.id)]);

  const games = toUIGamesFromDb(dbRows);
  const picks = toPickEntries(myPicks);

  return { week, games, picks };
};

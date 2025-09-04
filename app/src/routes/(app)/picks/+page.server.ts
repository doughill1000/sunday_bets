// +page.server.ts
import type { PageServerLoad } from './$types';
import { findActiveWeek, getMyPicks } from '$lib/server/db';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';
import { toUIGamesFromDb } from '$lib/adapters/games';
import { toPickEntries } from '$lib/adapters/picks';

function pushTiming(event: any, name: string, durMs: number) {
  (event.locals as any)._timings = (event.locals as any)._timings ?? [];
  (event.locals as any)._timings.push({ name, dur: Math.round(durMs) });
}

export const load: PageServerLoad = async (event) => {
  const ctx = { path: event.url.pathname };

  // findActiveWeek
  const t0 = performance.now();
  let week;
  try {
    week = await findActiveWeek();
  } catch (err) {
    console.error('findActiveWeek failed', { ...ctx, error: err });
    throw err;
  } finally {
    pushTiming(event, 'findActiveWeek', performance.now() - t0);
  }

  if (!week) return { week: null, games: [], picks: {} };

  // Parallel calls with individual timing
  const t1 = performance.now();
  const p1 = (async () => {
    const s0 = performance.now();
    const rows = await getActiveWeekGames();
    pushTiming(event, 'getActiveWeekGames', performance.now() - s0);
    return rows;
  })();

  const p2 = (async () => {
    const s0 = performance.now();
    const picks = await getMyPicks(event, week.id);
    pushTiming(event, 'getMyPicks', performance.now() - s0);
    return picks;
  })();

  const [dbRows, myPicks] = await Promise.all([p1, p2]);
  pushTiming(event, 'games+picks.parallel', performance.now() - t1);

  // remaining cheap transforms
  const t2 = performance.now();
  const games = toUIGamesFromDb(dbRows);
  pushTiming(event, 'toUIGamesFromDb', performance.now() - t2);

  const t3 = performance.now();
  const picks = toPickEntries(myPicks);
  pushTiming(event, 'toPickEntries', performance.now() - t3);

  return { week, games, picks };
};

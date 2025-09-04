// src/routes/api/games/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { getActiveWeekGames } from '$lib/server/db/queries/getActiveWeekGames';

export const GET: RequestHandler = async () => {
  try {
    const games = await getActiveWeekGames();
    return json({ games }, { status: 200 });
  } catch (error: any) {
    return json({ ok: false, reason: error.message ?? 'Unknown error' }, { status: 500 });
  }
};

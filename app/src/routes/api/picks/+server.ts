// src/routes/api/picks/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { listWeekGamesWithPicks } from '$lib/server/games';

export const GET: RequestHandler = async (event) => {
  try {
    const weekIdParam = event.url.searchParams.get('weekId') ?? event.params.weekId;
    if (!weekIdParam) {
      return json({ ok: false, reason: 'weekId required' }, { status: 400 });
    }

    // service does auth + data shaping
    const games = await listWeekGamesWithPicks(event, Number(weekIdParam));
    return json({ weekId: Number(weekIdParam), games }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/picks failed:', e);
    return json({ ok: false, reason: e.message ?? 'Unknown error' }, { status: 500 });
  }
};

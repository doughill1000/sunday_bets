// src/routes/api/admin/sync-odds/+server.ts
import type { RequestHandler } from './$types';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';

export const POST: RequestHandler = async (event) => {
  if (event.locals.isAdmin !== true) {
    return new Response(JSON.stringify({ ok: false, reason: 'Unauthorized' }), { status: 401 });
  }
  try {
    const res = await syncOddsForActiveWeek();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, reason: res.reason }), {
        status: 400
      });
    }

    return new Response(JSON.stringify({ ok: true, count: res.count }), { status: 200 });
  } catch (e: any) {
    console.error('sync-odds failed', e);
    return new Response(JSON.stringify({ ok: false, reason: e.message ?? 'Unknown error' }), {
      status: 500
    });
  }
};

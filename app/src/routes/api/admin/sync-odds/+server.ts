// src/routes/api/admin/sync-odds/+server.ts
import type { RequestHandler } from './$types';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import { requireAdmin } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  try {
    await requireAdmin(event);

    const res = await syncOddsForActiveWeek();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, reason: res.reason }), {
        // status: res.status ?? 400
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

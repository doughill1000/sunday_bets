// src/routes/api/admin/sync-odds/+server.ts
import type { RequestHandler } from './$types';
import { syncOddsForActiveAndUpcomingWeeks } from '$lib/server/oddsSync';
import { requireAdmin } from '$lib/server/auth';

// The manual "sync odds now" button. It runs the same two-week scope as the
// `sync-odds` cron (#801) — an admin reaching for this wants the slates lined,
// which includes the one about to go live.
export const POST: RequestHandler = async (event) => {
  const guard = await requireAdmin(event);
  if (guard) return guard;
  try {
    const res = await syncOddsForActiveAndUpcomingWeeks();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, reason: res.reason }), {
        status: 400
      });
    }

    return new Response(JSON.stringify({ ok: true, count: res.count }), { status: 200 });
  } catch (e) {
    console.error('sync-odds failed', e);
    return new Response(
      JSON.stringify({ ok: false, reason: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500 }
    );
  }
};

import type { RequestHandler } from './$types';
import { syncSchedule, targetNFLYear } from '$lib/server/scheduleSync';
import { requireAdmin } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  const guard = await requireAdmin(event);
  if (guard) return guard;

  let year: number;
  try {
    const body = await event.request.json().catch(() => ({}));
    year = typeof body?.year === 'number' ? body.year : targetNFLYear();
  } catch {
    year = targetNFLYear();
  }

  try {
    const res = await syncSchedule(year);
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, reason: res.reason }), { status: 400 });
    }
    return new Response(JSON.stringify(res), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, reason: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500 }
    );
  }
};

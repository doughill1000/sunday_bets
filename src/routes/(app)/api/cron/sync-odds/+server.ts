import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import { detectLineShifts } from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;
  const jobResult = await withCronLog('sync-odds', async () => {
    const res = await syncOddsForActiveWeek();
    if (!res.ok) throw new Error(res.reason);

    // Lines just refreshed — alert users whose picked lines moved past their
    // threshold. A notification failure must not fail the sync itself.
    let lineShifts: unknown;
    try {
      lineShifts = await detectLineShifts();
    } catch (e) {
      Sentry.captureException(e);
      lineShifts = { error: e instanceof Error ? e.message : 'line-shift detection failed' };
    }

    return { ...res, lineShifts };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import {
  detectLineShifts,
  sendPickReminders,
  gamesKickingOffWithin
} from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

// Hours before kickoff during which we sync odds + check line moves each run.
const SYNC_PROXIMITY_HOURS = 6;

// POST /api/cron/pregame — hourly, kickoff-driven.
// When games are near kickoff: refresh odds (cap-guarded) and alert on line
// moves. Always: nudge unpicked games kicking off in the next few hours.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('pregame', async () => {
    const near = await gamesKickingOffWithin(SYNC_PROXIMITY_HOURS);

    let synced: unknown = { skipped: true };
    let lineShifts: unknown = { skipped: true };

    if (near > 0) {
      const res = await syncOddsForActiveWeek();
      synced = res;
      // A notification failure must not fail the sync/job.
      try {
        lineShifts = res.ok ? await detectLineShifts() : { skipped: true, reason: 'sync failed' };
      } catch (e) {
        Sentry.captureException(e);
        lineShifts = { error: e instanceof Error ? e.message : 'line-shift detection failed' };
      }
    }

    let reminders: unknown;
    try {
      reminders = await sendPickReminders();
    } catch (e) {
      Sentry.captureException(e);
      reminders = { error: e instanceof Error ? e.message : 'reminder send failed' };
    }

    return { near, synced, lineShifts, reminders };
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import { runPregameNotifications, gamesKickingOffWithin } from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

// Hours before kickoff during which we sync odds + check line moves each run.
const SYNC_PROXIMITY_HOURS = 6;

// POST /api/cron/pregame — hourly, kickoff-driven.
// When games are near kickoff: refresh odds (cap-guarded). Then one merged
// pregame notification pass (#731): pick reminders + fresh line-shift alerts
// over the same ~90-min window, at most one push per user per run. Line shifts
// are only evaluated right after a successful sync.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('pregame', async () => {
    const near = await gamesKickingOffWithin(SYNC_PROXIMITY_HOURS);

    let synced: unknown = { skipped: true };
    let syncOk = false;
    if (near > 0) {
      const res = await syncOddsForActiveWeek();
      synced = res;
      syncOk = res.ok;
    }

    let lineShifts: unknown;
    let reminders: unknown;
    let pushes: unknown;
    // A notification failure must not fail the sync/job.
    try {
      const summary = await runPregameNotifications(new Date(), {
        includeLineShifts: near > 0 && syncOk
      });
      reminders = summary.reminders;
      pushes = summary.pushes;
      lineShifts =
        near > 0 && !syncOk ? { skipped: true, reason: 'sync failed' } : summary.lineShifts;
    } catch (e) {
      Sentry.captureException(e);
      const error = e instanceof Error ? e.message : 'pregame notifications failed';
      reminders = { error };
      lineShifts = { error };
      pushes = 0;
    }

    return { near, synced, lineShifts, reminders, pushes };
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

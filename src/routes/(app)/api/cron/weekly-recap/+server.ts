import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { sendResultsRecap, sendAIRecapPushes } from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { findRecentGradableWeeks } from '$lib/server/db/queries/findRecentGradableWeeks';

// POST /api/cron/weekly-recap — Tue 14:00 UTC (~9am ET).
//
// Split out from the grade cron so the "here's your week" pushes land at a civilized
// morning hour instead of whenever grading happens to first see a fully-settled week
// (previously the Tue 09:00 catch-all, i.e. ~4-5am ET — right after MNF). Grading itself
// still settles MNF overnight (grade's Tue 05:00 run); this cron only sends the pushes,
// hours later. Both sendResultsRecap and sendAIRecapPushes are gated on full-week-grading
// and deduped per (user, week) / (user, group, week) via notification_log, so calling them
// here — on whichever weeks findRecentGradableWeeks() currently considers recent — is a
// safe no-op for anything not yet fully graded or already pushed.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('weekly-recap', async () => {
    const weeks = await findRecentGradableWeeks();

    const recaps = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendResultsRecap(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'results recap failed'
          };
        }
      })
    );

    const aiRecapPushes = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendAIRecapPushes(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'ai recap push failed'
          };
        }
      })
    );

    return {
      weekIds: weeks.map((w) => w.id),
      recaps,
      aiRecapPushes
    };
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

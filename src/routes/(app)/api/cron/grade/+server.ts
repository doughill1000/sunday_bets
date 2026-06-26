import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { gradeWeek } from '$lib/server/grading';
import { sendResultsRecap } from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { findRecentGradableWeeks } from '$lib/server/db/queries/findRecentGradableWeeks';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;
  const jobResult = await withCronLog('grade', async () => {
    const weeks = await findRecentGradableWeeks();
    const results = await Promise.all(
      weeks.map((w) => gradeWeek(w.id, { refreshScores: true, daysFrom: 3 }))
    );

    // After grading, recap any week that is now fully settled. The completeness
    // gate + per-(user, week) dedup inside sendResultsRecap make this a no-op on
    // partial weeks and safe to re-run. A recap failure must not fail grading.
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

    return { weekIds: weeks.map((w) => w.id), results, recaps };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { sendWeeklyRecap } from '$lib/server/notifications';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { findRecentGradableWeeks } from '$lib/server/db/queries/findRecentGradableWeeks';

// POST /api/cron/weekly-recap — Tue 14:00 UTC (~9am ET).
//
// Split out from the grade cron so the "here's your week" push lands at a civilized
// morning hour instead of whenever grading happens to first see a fully-settled week
// (previously the Tue 09:00 catch-all, i.e. ~4-5am ET — right after MNF). Grading itself
// still settles MNF overnight (grade's Tue 05:00 run); this cron only sends the push,
// hours later.
//
// One pass per week: sendWeeklyRecap (#813) delivers a single merged push per (user,
// group) carrying whichever of the two post-grading concerns are due — the user's own
// record, and their league's AI recap beat. It used to be two senders called back-to-back,
// which buzzed an opted-in phone twice within seconds with two halves of one moment.
//
// The pass is gated on the week being a scoring round (#789); its results half is
// additionally gated on full-week grading, while the AI half's gate is that generation
// already wrote an ai_recaps row. Both dedupe per (user, week) / (user, group, week) via
// notification_log — so calling this here, on whichever weeks findRecentGradableWeeks()
// currently considers recent, is a safe no-op for a preseason round, a week not yet fully
// graded, or anything already pushed.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('weekly-recap', async () => {
    const weeks = await findRecentGradableWeeks();

    const recaps = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendWeeklyRecap(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'weekly recap failed'
          };
        }
      })
    );

    return {
      weekIds: weeks.map((w) => w.id),
      recaps
    };
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

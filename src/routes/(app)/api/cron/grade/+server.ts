import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { gradeWeek } from '$lib/server/grading';
import { sendResultsRecap, sendAIRecapPushes } from '$lib/server/notifications';
import { sendAIRecaps } from '$lib/server/aiRecap';
import { sendSeasonWrappeds } from '$lib/server/seasonWrapped';
import { sendBadgeFlavors } from '$lib/server/badgeFlavor';
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

    // After push recaps, generate AI recaps for each enabled group (ADR-0008).
    // Runs post-grade + post-refreshLeaderboardStats (which runs inside gradeWeek).
    // Errors → Sentry only; never fail grading.
    const aiRecaps = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendAIRecaps(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'ai recap failed'
          };
        }
      })
    );

    // After AI recaps generate, push a "recap ready" notification per opted-in
    // member (#302, reuses the results-recap dedup shape). Evaluates whichever
    // ai_recaps rows now exist, so it's a no-op for groups that didn't generate
    // one. Errors → Sentry only; never fail grading.
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

    // After the weekly AI recap, generate Season Wrapped at season's end (#347, ADR-0008).
    // No-op except on a fully-graded FINAL week of a complete season; idempotent per subject.
    // Errors → Sentry only; never fail grading.
    const seasonWrappeds = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendSeasonWrappeds(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'season wrapped failed'
          };
        }
      })
    );

    // After Season Wrapped, voice the crowned badges at season's end (#416, ADR-0008). Same
    // final-week/complete-season gate; idempotent per badge. Errors → Sentry only; never fail
    // grading.
    const badgeFlavors = await Promise.all(
      weeks.map(async (w) => {
        try {
          return { weekId: w.id, ...(await sendBadgeFlavors(w.id)) };
        } catch (e) {
          Sentry.captureException(e);
          return {
            weekId: w.id,
            error: e instanceof Error ? e.message : 'badge flavors failed'
          };
        }
      })
    );

    return {
      weekIds: weeks.map((w) => w.id),
      results,
      recaps,
      aiRecaps,
      aiRecapPushes,
      seasonWrappeds,
      badgeFlavors
    };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

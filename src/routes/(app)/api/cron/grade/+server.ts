import type { RequestHandler } from './$types';
import * as Sentry from '@sentry/sveltekit';
import { gradeWeek, refreshReadModels } from '$lib/server/grading';
import { sendAIRecaps } from '$lib/server/aiRecap';
import { sendSeasonWrappeds } from '$lib/server/seasonWrapped';
import { sendBadgeFlavors } from '$lib/server/badgeFlavor';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { findRecentGradableWeeks } from '$lib/server/db/queries/findRecentGradableWeeks';
import { findUnsettledGradableWeeks } from '$lib/server/db/queries/findUnsettledGradableWeeks';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;
  const jobResult = await withCronLog('grade', async () => {
    // #744: don't reselect the most-recently-concluded week once it has no grading
    // work left, or a finished season's final week regrades on every tick forever.
    const weeks = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });
    // Grade each target week but SUPPRESS the whole-table stats/ratings refresh (#622): the two
    // globals are hoisted into one refreshReadModels() call below, after every week (recent +
    // reconcile) is settled. Doing it per-week fanned out into concurrent full ratings rebuilds
    // that could transiently empty player_ratings and refreshed the 17 matviews twice per run.
    const results = await Promise.all(
      weeks.map((w) =>
        gradeWeek(w.id, { refreshScores: true, daysFrom: 3, skipReadModelRefresh: true })
      )
    );

    // Reconcile sweep (#433) BEFORE the single read-model refresh, so its grades are covered by
    // that one refresh too: self-heal any OTHER week that has final scores but was never settled —
    // a week missed during the cron's normal processing window, which findRecentGradableWeeks
    // (active + most-recently-concluded only) never revisits. These weeks are graded to SETTLE
    // their picks but deliberately skip the recap/AI/push/Wrapped fan-out below, which must stay
    // scoped to genuinely-recent weeks. find_unsettled_weeks() already excludes frozen seasons and
    // any week whose finals are all settled, so it is a no-op once healed; we additionally drop the
    // recent weeks just graded above (now settled) to avoid re-grading them here. A sweep failure
    // must not fail the primary grade.
    let reconcile: unknown;
    try {
      const recentIds = new Set(weeks.map((w) => w.id));
      const unsettled = (await findUnsettledGradableWeeks()).filter((w) => !recentIds.has(w.id));
      reconcile = await Promise.all(
        unsettled.map(async (w) => {
          try {
            return { weekId: w.id, ...(await gradeWeek(w.id, { skipReadModelRefresh: true })) };
          } catch (e) {
            Sentry.captureException(e);
            return {
              weekId: w.id,
              error: e instanceof Error ? e.message : 'reconcile grade failed'
            };
          }
        })
      );
    } catch (e) {
      Sentry.captureException(e);
      reconcile = { error: e instanceof Error ? e.message : 'reconcile sweep failed' };
    }

    // Now that every week (recent + reconcile) is settled, rebuild the two whole-table read models
    // exactly once (#622). refreshReadModels() is best-effort internally — each step swallows and
    // logs its own error — so it never fails the grade. It runs BEFORE the recaps below because the
    // AI recap reads the freshly-refreshed leaderboard/stats matviews (ADR-0008).
    await refreshReadModels();

    // Generate AI recap content for each enabled group (ADR-0008). Runs post-grade +
    // post the single refreshReadModels() above (leaderboard/stats matviews). This only
    // generates the recap row; the "recap ready" push (and the results-recap push) are
    // sent separately by the weekly-recap cron so they land at a civilized hour instead
    // of whenever grading happens to settle the week (see docs/changelog.d for why).
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
      aiRecaps,
      seasonWrappeds,
      badgeFlavors,
      reconcile
    };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

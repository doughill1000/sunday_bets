import type { RequestHandler } from './$types';
import { syncOddsForActiveAndUpcomingWeeks } from '$lib/server/oddsSync';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

// Daily (Tue–Sat, plus a post-rollover Tuesday run) sync that keeps lines fresh
// for the picks UI. It covers the active week *and* primes the next upcoming one
// (#801), so a slate is already lined by the time it goes live. Near-kickoff
// syncing + line-movement alerts live in the hourly `pregame` cron, which stays
// active-week-only.
//
// `syncOddsForActiveAndUpcomingWeeks` returns a structured `{ ok: false, reason }`
// for the *expected* no-op conditions it handles gracefully — no active week
// (offseason or between weeks) and the monthly Odds-API cap being reached. Those
// are not failures: the job ran, there was simply nothing to sync. We record the
// result in cron_run_log and return 200 so neither the scheduler nor Sentry treats
// a quiet offseason day as an incident. Genuine faults (DB/network errors) on the
// *active* week still throw from inside the job, so withCronLog reports them to
// Sentry and this endpoint returns 500; a failure priming the upcoming week is
// reported in that week's own entry in `weeks[]` instead, so it never costs the
// live slate its completed sync. Mirrors how the `pregame` cron stores its sync
// result without throwing.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  // Do not convert a graceful `{ ok: false }` skip into a thrown error — only a
  // real exception from the job should mark the run failed (jobResult.ok=false).
  const jobResult = await withCronLog('sync-odds', () => syncOddsForActiveAndUpcomingWeeks());

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

import type { RequestHandler } from './$types';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

// Daily (Tue–Sat) sync that keeps lines fresh for the picks UI. Near-kickoff
// syncing + line-movement alerts live in the hourly `pregame` cron.
//
// `syncOddsForActiveWeek` returns a structured `{ ok: false, reason }` for the
// *expected* no-op conditions it handles gracefully — no active week (offseason
// or between weeks) and the monthly Odds-API cap being reached. Those are not
// failures: the job ran, there was simply nothing to sync. We record the result
// in cron_run_log and return 200 so neither the scheduler nor Sentry treats a
// quiet offseason day as an incident. Genuine faults (DB/network errors) still
// throw from inside syncOddsForActiveWeek, so withCronLog reports them to Sentry
// and this endpoint returns 500. Mirrors how the `pregame` cron stores its sync
// result without throwing.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  // Do not convert a graceful `{ ok: false }` skip into a thrown error — only a
  // real exception from the job should mark the run failed (jobResult.ok=false).
  const jobResult = await withCronLog('sync-odds', () => syncOddsForActiveWeek());

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

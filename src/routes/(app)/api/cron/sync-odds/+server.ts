import type { RequestHandler } from './$types';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

// Daily (Tue–Sat) sync that keeps lines fresh for the picks UI. Near-kickoff
// syncing + line-movement alerts live in the hourly `pregame` cron.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;
  const jobResult = await withCronLog('sync-odds', async () => {
    const res = await syncOddsForActiveWeek();
    if (!res.ok) throw new Error(res.reason);
    return res;
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

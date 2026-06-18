import type { RequestHandler } from './$types';
import { resetOddsApiUsage } from '$lib/server/settings';
import { requireCronSecret, withCronLog } from '$lib/server/cron';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;
  const jobResult = await withCronLog('reset-odds-usage', async () => {
    await resetOddsApiUsage();
    return { reset: true };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

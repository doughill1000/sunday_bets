import type { RequestHandler } from './$types';
import { gradeWeek } from '$lib/server/grading';
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
    return { weekIds: weeks.map((w) => w.id), results };
  });
  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

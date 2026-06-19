import type { RequestHandler } from './$types';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { sendPickReminders } from '$lib/server/notifications';

// POST /api/cron/send-reminders — nudge users with unpicked games <48h out.
export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('send-reminders', async () => {
    return sendPickReminders();
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

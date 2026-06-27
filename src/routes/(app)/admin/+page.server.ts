// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { getActiveWeek, getSettingsSummary, getGameplaySettings } from '$lib/server/admin';
import { getRecentCronRuns } from '$lib/server/db/queries/getRecentCronRuns';
import { computeCronHeadroom } from '$lib/server/scalingSignals';

export const load: PageServerLoad = async () => {
  const nowIso = new Date().toISOString();

  const [settings, activeWeek, cronRuns, gameplay] = await Promise.all([
    getSettingsSummary(),
    getActiveWeek(nowIso),
    getRecentCronRuns(),
    getGameplaySettings()
  ]);

  // Notification-cron duration vs the Vercel function timeout — the hard Tier-B
  // scaling trigger, derived from the same cron_run_log rows shown below.
  const notificationHeadroom = computeCronHeadroom(cronRuns);

  return { settings, activeWeek, cronRuns, gameplay, notificationHeadroom };
};

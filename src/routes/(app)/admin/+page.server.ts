// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import {
  getActiveWeek,
  getSettingsSummary,
  getGameplaySettings,
  getGradableWeeks,
  getSeasons
} from '$lib/server/admin';
import { getRecentCronRuns } from '$lib/server/db/queries/getRecentCronRuns';
import { computeCronHeadroom } from '$lib/server/scalingSignals';
import { staleReadModels } from '$lib/server/cronSummary';

export const load: PageServerLoad = async () => {
  const nowIso = new Date().toISOString();

  const [settings, activeWeek, cronRuns, gameplay, weeks, seasons] = await Promise.all([
    getSettingsSummary(),
    getActiveWeek(nowIso),
    getRecentCronRuns(),
    getGameplaySettings(),
    getGradableWeeks(),
    getSeasons()
  ]);

  // Notification-cron duration vs the Vercel function timeout — the hard Tier-B
  // scaling trigger, derived from the same cron_run_log rows shown below.
  const notificationHeadroom = computeCronHeadroom(cronRuns);

  // A grade run reports ok=true even when its best-effort read-model refreshes failed, so read
  // the per-step outcomes back out of each run's summary and let the card flag the staleness
  // (#623). Rows from before #623 carry no outcomes and read as non-degraded.
  const runs = cronRuns.map((run) => ({ ...run, staleReadModels: staleReadModels(run.summary) }));

  return { settings, activeWeek, cronRuns: runs, gameplay, weeks, seasons, notificationHeadroom };
};

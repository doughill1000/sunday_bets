// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { getActiveWeek, getSettingsSummary, getGameplaySettings } from '$lib/server/admin';
import { getRecentCronRuns } from '$lib/server/db/queries/getRecentCronRuns';

export const load: PageServerLoad = async () => {
  const nowIso = new Date().toISOString();

  const [settings, activeWeek, cronRuns, gameplay] = await Promise.all([
    getSettingsSummary(),
    getActiveWeek(nowIso),
    getRecentCronRuns(),
    getGameplaySettings()
  ]);

  return { settings, activeWeek, cronRuns, gameplay };
};

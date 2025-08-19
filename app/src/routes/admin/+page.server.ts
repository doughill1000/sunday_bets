// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { getActiveWeek, getSettingsSummary } from '$lib/server/admin';

export const load: PageServerLoad = async () => {
  const nowIso = new Date().toISOString();

  const [settings, activeWeek] = await Promise.all([
    getSettingsSummary(),
    getActiveWeek(nowIso),
  ]);

  return { settings, activeWeek };
};

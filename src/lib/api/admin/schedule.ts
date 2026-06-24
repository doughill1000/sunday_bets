import { post } from '$lib/api';
import type { ScheduleSyncStats } from '$lib/server/scheduleSync';

type SyncScheduleResponse = ScheduleSyncStats | { ok: false; reason: string };

export function syncSchedule(year?: number) {
  return post<SyncScheduleResponse>('/api/admin/sync-schedule', year ? { year } : {});
}

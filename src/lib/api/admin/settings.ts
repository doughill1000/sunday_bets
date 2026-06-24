import { patch } from '$lib/api';

type SettingsPatchResponse = { ok: boolean; reason?: string };

export function updateFinalWeekAllin(enabled: boolean) {
  return patch<SettingsPatchResponse>('/api/admin/settings', {
    final_week_unlimited_allin: enabled
  });
}

import { post } from '$lib/api';

type SyncOddsResponse = {
  ok: boolean;
  count?: number;
  reason?: string;
};

export function syncOdds() {
  return post<SyncOddsResponse>('/api/admin/sync-odds');
}
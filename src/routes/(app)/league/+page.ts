import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchLeaderboard, fetchAllTimeLeaderboard, fetchGroup } from '$lib/query/fetchers';
import type {
  LeaderboardCachePayload,
  AllTimeLeaderboardPayload,
  GroupCachePayload
} from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable standings, the
  // season-independent All-time totals (#376), and the group payload (#561: its honors, badges and
  // members feed the League-home honors case) so first paint has data with no flash; handed to the
  // component as `initialData`. Skipped on client-side navigation so navigation is never blocked —
  // each `createQuery` serves the cache instantly and revalidates in the background (ADR-0017). The
  // group payload is keyed on the same resolved season, so the League home and /league/manage share
  // one cache entry. The Weekly breakdown is not prefetched here; it stays on the server `load`.
  let initialLeaderboard: LeaderboardCachePayload | undefined;
  let initialAllTime: AllTimeLeaderboardPayload | undefined;
  let initialGroup: GroupCachePayload | undefined;
  if (!browser) {
    [initialLeaderboard, initialAllTime, initialGroup] = await Promise.all([
      fetchLeaderboard(fetch, data.groupId, data.seasonYear),
      fetchAllTimeLeaderboard(fetch, data.groupId),
      fetchGroup(fetch, data.groupId, data.seasonYear)
    ]);
  }

  return { ...data, initialLeaderboard, initialAllTime, initialGroup };
};

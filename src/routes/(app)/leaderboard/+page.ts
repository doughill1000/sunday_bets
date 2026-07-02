import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchLeaderboard, fetchAllTimeLeaderboard } from '$lib/query/fetchers';
import type { LeaderboardCachePayload, AllTimeLeaderboardPayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable standings
  // (and the season-independent All-time totals, #376) so first paint has data with no
  // flash; handed to the component as `initialData`. Skipped on client-side navigation so
  // navigation is never blocked — the component's `createQuery` serves the cache instantly
  // and revalidates in the background (ADR-0017). The Weekly breakdown is not prefetched
  // here; it stays on the server `load` (user-specific).
  let initialLeaderboard: LeaderboardCachePayload | undefined;
  let initialAllTime: AllTimeLeaderboardPayload | undefined;
  if (!browser) {
    [initialLeaderboard, initialAllTime] = await Promise.all([
      fetchLeaderboard(fetch, data.groupId, data.seasonYear),
      fetchAllTimeLeaderboard(fetch, data.groupId)
    ]);
  }

  return { ...data, initialLeaderboard, initialAllTime };
};

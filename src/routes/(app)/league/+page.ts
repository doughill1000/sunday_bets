import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import {
  fetchLeaderboard,
  fetchAllTimeLeaderboard,
  fetchGroup,
  fetchRecap
} from '$lib/query/fetchers';
import type {
  LeaderboardCachePayload,
  AllTimeLeaderboardPayload,
  GroupCachePayload,
  RecapCachePayload
} from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable standings, the
  // season-independent All-time totals (#376), and the group payload (#561: its honors, badges and
  // members feed the League-home honors case) so first paint has data with no flash; handed to the
  // component as `initialData`. Skipped on client-side navigation so navigation is never blocked —
  // each `createQuery` serves the cache instantly and revalidates in the background (ADR-0017). The
  // group payload is keyed on the same resolved season, so the League home and /league/manage share
  // one cache entry. The Week breakdown is not prefetched here; it stays on the server `load`.
  let initialLeaderboard: LeaderboardCachePayload | undefined;
  let initialAllTime: AllTimeLeaderboardPayload | undefined;
  let initialGroup: GroupCachePayload | undefined;
  let initialRecap: RecapCachePayload | undefined;
  if (!browser) {
    // The recap payload backs the Honors tab's trophy shelf (#741), sharing `/recap`'s cache
    // entry. Fetched only on a `?view=honors` request — the only way the shelf is ever
    // server-rendered — so the far more common Standings visit doesn't pay for several matview
    // reads it will never show. Reaching Honors by tap enables the query client-side instead (its
    // panel is a pure client flip). The Week hardware's own prefetch moved to /week's load (#776).
    [initialLeaderboard, initialAllTime, initialGroup, initialRecap] = await Promise.all([
      fetchLeaderboard(fetch, data.groupId, data.seasonYear),
      fetchAllTimeLeaderboard(fetch, data.groupId),
      fetchGroup(fetch, data.groupId, data.seasonYear),
      data.view === 'honors'
        ? fetchRecap(fetch, data.groupId, data.seasonYear)
        : Promise.resolve(undefined)
    ]);
  }

  return { ...data, initialLeaderboard, initialAllTime, initialGroup, initialRecap };
};

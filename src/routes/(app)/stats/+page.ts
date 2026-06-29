import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchStats } from '$lib/query/fetchers';
import type { StatsCachePayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // On the server (initial request — its result is reused for hydration), prefetch the
  // cacheable Stats payload so first paint has data with no flash; it is handed to the
  // component as `initialData`. On client-side navigation this is skipped so navigation is
  // never blocked on the aggregation — the component's `createQuery` serves the cache
  // instantly and revalidates in the background (ADR-0017).
  let initialStats: StatsCachePayload | undefined;
  if (!browser) {
    initialStats = await fetchStats(fetch, data.groupId, data.seasonYear);
  }

  return { ...data, initialStats };
};

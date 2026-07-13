import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchRecap } from '$lib/query/fetchers';
import type { RecapCachePayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable Recap
  // payload so first paint has data with no flash; handed to the component as
  // `initialData`. Skipped on client-side navigation so navigation is never blocked — the
  // component's `createQuery` serves the cache instantly and revalidates in the background
  // (ADR-0033, issue #602).
  let initialRecap: RecapCachePayload | undefined;
  if (!browser) {
    initialRecap = await fetchRecap(fetch, data.groupId, data.seasonYear);
  }

  return { ...data, initialRecap };
};

import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchRecap } from '$lib/query/fetchers';
import type { RecapCachePayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable recap payload
  // that backs the week's hardware (#631/#776) so first paint has data with no flash; handed to
  // the component as `initialData`. It is the SAME `['recap', groupId, season]` cache entry that
  // /recap and the /league Honors shelf own (ADR-0033, #602), so they can never disagree about a
  // week's awards. Skipped on client-side navigation so navigation is never blocked — the
  // `createQuery` serves the cache instantly and revalidates in the background (ADR-0017). The
  // user-scoped pick breakdown is not prefetched here; it stays on the server `load` (boundary 3).
  let initialRecap: RecapCachePayload | undefined;
  if (!browser) {
    initialRecap = await fetchRecap(fetch, data.groupId, data.seasonYear);
  }
  return { ...data, initialRecap };
};

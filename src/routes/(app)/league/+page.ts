import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchLeague } from '$lib/query/fetchers';
import type { LeagueCachePayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // On the server (initial request, reused for hydration), prefetch the cacheable League
  // payload so first paint has data with no flash; handed to the component as `initialData`.
  // On client-side navigation this is skipped — the component's `createQuery` serves the
  // cache instantly and revalidates in the background (ADR-0017).
  let initialLeague: LeagueCachePayload | undefined;
  if (!browser) {
    initialLeague = await fetchLeague(fetch, data.seasonYear);
  }

  return { ...data, initialLeague };
};

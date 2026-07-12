import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchGroup } from '$lib/query/fetchers';
import type { GroupCachePayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // Server-side (initial request — reused for hydration): prefetch the shareable Group
  // payload so first paint has data with no flash; handed to the component as `initialData`.
  // Skipped on client-side navigation so navigation is never blocked — the component's
  // `createQuery` serves the cache instantly and revalidates in the background (ADR-0017).
  let initialGroup: GroupCachePayload | undefined;
  if (!browser) {
    initialGroup = await fetchGroup(fetch, data.groupId, data.badgeSeasonYear);
  }

  return { ...data, initialGroup };
};

// QueryClient + IndexedDB persister wiring for the client data cache (ADR-0017).
import { QueryClient } from '@tanstack/svelte-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/svelte-query-persist-client';
import { get, set, del } from 'idb-keyval';
import { browser } from '$app/environment';
import { SHAREABLE_QUERY_ROOTS } from './keys';

/** A revisit within this window renders from cache with no refetch; after it, a revisit
 * serves cache instantly and revalidates in the background. */
const STALE_TIME = 45_000; // 45s
/** Keep entries in memory long enough to be useful across in-session navigation and to
 * persist meaningfully; also the persisted `maxAge` bound. */
const GC_TIME = 1000 * 60 * 60 * 24; // 24h

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false
      }
    }
  });
}

// A single browser-wide QueryClient (so navigations reuse one cache); a fresh one per
// request on the server (no cross-request leakage).
let browserQueryClient: QueryClient | undefined;
export function getQueryClient(): QueryClient {
  if (!browser) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

// idb-keyval-backed storage adapter for the async persister. Touches IndexedDB lazily on
// first get/set, so importing this module on the server is inert.
const idbStorage = {
  getItem: async (key: string): Promise<string | null> => (await get<string>(key)) ?? null,
  setItem: (key: string, value: string): Promise<void> => set(key, value),
  removeItem: (key: string): Promise<void> => del(key)
};

const SHAREABLE_ROOTS: readonly string[] = SHAREABLE_QUERY_ROOTS;

/** Persistence options for `PersistQueryClientProvider`. Only created/used in the browser.
 * Persists only successful, shareable read data; busted on every deploy; bounded maxAge. */
export function makePersistOptions(): Omit<PersistQueryClientOptions, 'queryClient'> {
  return {
    persister: createAsyncStoragePersister({
      storage: idbStorage,
      key: 'sunday-bets-query-cache'
    }),
    maxAge: GC_TIME,
    // A deploy changes the build id, invalidating any persisted cache (ADR-0017).
    buster: __BUILD_ID__,
    dehydrateOptions: {
      // Persist only shareable read data (never commissioner/invite/sensitive) and only
      // successful results — ADR-0017 boundary 3 + 4.
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' &&
        typeof query.queryKey[0] === 'string' &&
        SHAREABLE_ROOTS.includes(query.queryKey[0])
    }
  };
}

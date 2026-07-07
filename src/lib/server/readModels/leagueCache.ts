// Shared composer for the cacheable League ATS payload (ADR-0017, issue #406).
//
// Used by both the `/league` page `load` (SSR `initialData`) and the `/api/league` read
// route (client revalidation) so the two paths cannot drift. League data is group- and
// user-independent, so — unlike statsCache — the payload is keyed by season alone.
import { getLeagueAts } from '$lib/server/db/queries/league';
import type { LeagueCachePayload } from '$lib/query/types';

export type { LeagueCachePayload };

export async function getLeagueCachePayload(seasonYear: number): Promise<LeagueCachePayload> {
  return getLeagueAts(seasonYear);
}

// Shared composer for the cacheable Stats payload (ADR-0017).
//
// Used by both the `/stats` page `load` (SSR `initialData`) and the `/api/stats` read
// route (client revalidation) so the two paths cannot drift. Reuses the existing query
// functions — no new SQL. The heavier all-time detail (Career/Head-to-head tabs) is NOT
// part of this payload: it stays streamed off the page `load` critical path.
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason, getAllTimeTotals } from '$lib/server/db/queries/stats';
import type { StatsCachePayload } from '$lib/query/types';

export type { StatsCachePayload };

export async function getStatsCachePayload(
  groupId: string,
  seasonYear: number
): Promise<StatsCachePayload> {
  const [allTimeTotals, stats, totals] = await Promise.all([
    getAllTimeTotals(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  return { seasonYear, totals, allTimeTotals, ...stats };
}

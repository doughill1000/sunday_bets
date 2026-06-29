// Shared composer for the shareable Leaderboard **standings** payload (ADR-0017).
//
// Used by both the `/leaderboard` page `load` (SSR `initialData`) and the `/api/leaderboard`
// read route (client revalidation) so the two paths cannot drift. Only the season standings
// are composed here — they are identical for every member. The Weekly view's pick breakdown
// is intentionally excluded: it reads through the user-scoped RLS client with a kickoff gate
// (differs per user and over time), so it stays on the page `load` and is never cached or
// persisted (boundary 3). Reuses existing query functions — no new SQL.
import { getSeasonLeaderboardPage } from '$lib/server/db/queries/leaderboard';
import { getReigningChampion } from '$lib/server/db/queries/honors';
import type { LeaderboardCachePayload } from '$lib/query/types';

export type { LeaderboardCachePayload };

export async function getLeaderboardStandingsPayload(
  groupId: string,
  seasonYear: number,
  currentSeasonYear: number,
  opts: { cursor?: string | null } = {}
): Promise<LeaderboardCachePayload> {
  const [page, champion] = await Promise.all([
    getSeasonLeaderboardPage(seasonYear, groupId, { cursor: opts.cursor ?? null }),
    getReigningChampion(groupId)
  ]);

  // Crown only shown when viewing the current in-progress season.
  const championUserId = seasonYear === currentSeasonYear ? (champion?.user_id ?? null) : null;

  return {
    seasonYear,
    totals: page.entries,
    totalsCursor: page.nextCursor,
    championUserId
  };
}

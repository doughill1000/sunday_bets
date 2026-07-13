// Shared composer for the shareable Recap payload (ADR-0033, issue #602).
//
// Used by both the `/recap` page `load` (SSR `initialData`) and the `/api/recap` read
// route (client revalidation) so the two paths cannot drift. Both underlying reads are
// already group_id + season_year filtered and contain no sensitive/per-role data — the
// same shape as the Stats/Group payloads (ADR-0017). Reuses existing query functions —
// no new SQL.
import { getRecentRecaps } from '$lib/server/db/queries/recaps';
import { getSeasonWeeklyAwards } from '$lib/server/readModels/weeklyAwards';
import type { RecapCachePayload } from '$lib/query/types';

export async function getRecapCachePayload(
  groupId: string,
  seasonYear: number
): Promise<RecapCachePayload> {
  const [recaps, weeklyAwards] = await Promise.all([
    getRecentRecaps(groupId, seasonYear, 6),
    getSeasonWeeklyAwards(groupId, seasonYear)
  ]);

  return { recaps, weeklyAwards };
}

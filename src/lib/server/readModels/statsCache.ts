// Shared composer for the cacheable Stats payload (ADR-0017).
//
// Used by both the `/stats` page `load` (SSR `initialData`) and the `/api/stats` read
// route (client revalidation) so the two paths cannot drift. Reuses the existing query
// functions — no new SQL. The heavier all-time detail (Career/Head-to-head tabs) is NOT
// part of this payload: it stays streamed off the page `load` critical path.
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import {
  getStatsForSeason,
  getAllTimeTotals,
  getSituationalSplits,
  getLeagueSituationalBaseline,
  getSituationalSplitsSeason,
  getLeagueSituationalBaselineSeason,
  getTeamBook,
  getTeamBookAllTime,
  getLineSideAllTime
} from '$lib/server/db/queries/stats';
import { getGroupConfig } from '$lib/server/groupConfig';
import { isDropWorstWeekEnabled, type DropWorstWeekRules } from '$lib/domain/scoring';
import type { StatsCachePayload } from '$lib/query/types';

export type { StatsCachePayload };

export async function getStatsCachePayload(
  groupId: string,
  seasonYear: number
): Promise<StatsCachePayload> {
  const [
    allTimeTotals,
    stats,
    totals,
    config,
    situational,
    leagueSituationalBaseline,
    situationalSeason,
    leagueSituationalBaselineSeason,
    teamBook,
    teamBookAllTime,
    lineSideAllTime
  ] = await Promise.all([
    getAllTimeTotals(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId),
    getGroupConfig(groupId),
    // Career-grain (#502): the "Your edge" panel joins these per-user cuts to the league baseline.
    getSituationalSplits(groupId),
    getLeagueSituationalBaseline(),
    // Season-grain (#514): the situational explorer's season lens joins the same way for the
    // season in view. The query re-keys on season, so these follow the scope dropdown.
    getSituationalSplitsSeason(seasonYear, groupId),
    getLeagueSituationalBaselineSeason(seasonYear),
    // Team book (#564): season + career two-sided (backed/faded) records; both eager because the
    // signature strip leads the page and reads the career book above the streamed detail. Career
    // fav/dog lean is pooled from the season line-side rows for the same career-first signature.
    getTeamBook(seasonYear, groupId),
    getTeamBookAllTime(groupId),
    getLineSideAllTime(groupId)
  ]);

  // Group-level (cross-season) flag for the Career "Standings points" caption (ADR-0018).
  const dropActive = isDropWorstWeekEnabled(config?.scoring_rules as DropWorstWeekRules);

  return {
    seasonYear,
    totals,
    allTimeTotals,
    dropActive,
    situational,
    leagueSituationalBaseline,
    situationalSeason,
    leagueSituationalBaselineSeason,
    teamBook,
    teamBookAllTime,
    lineSideAllTime,
    ...stats
  };
}

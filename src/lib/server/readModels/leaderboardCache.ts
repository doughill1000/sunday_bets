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
import { getAllTimeTotals, getPlayerRatings } from '$lib/server/db/queries/stats';
import { getPlayers } from '$lib/server/db/queries/getPlayers';
import { getGroupConfig } from '$lib/server/groupConfig';
import {
  isDropWorstWeekActive,
  isDropWorstWeekEnabled,
  type DropWorstWeekRules
} from '$lib/domain/scoring';
import { denseRankAllTime } from '$lib/domain/leaderboard';
import { ratingLadder } from '$lib/domain/rating';
import type { LeaderboardCachePayload, AllTimeLeaderboardPayload } from '$lib/query/types';

export type { LeaderboardCachePayload, AllTimeLeaderboardPayload };

export async function getLeaderboardStandingsPayload(
  groupId: string,
  seasonYear: number,
  currentSeasonYear: number,
  opts: { cursor?: string | null } = {}
): Promise<LeaderboardCachePayload> {
  const [page, champion, config] = await Promise.all([
    getSeasonLeaderboardPage(seasonYear, groupId, { cursor: opts.cursor ?? null }),
    getReigningChampion(groupId),
    getGroupConfig(groupId)
  ]);

  // Crown only shown when viewing the current in-progress season.
  const championUserId = seasonYear === currentSeasonYear ? (champion?.user_id ?? null) : null;

  // Season-scoped drop-worst-week flag for the standings footnote (ADR-0018).
  const dropActive = isDropWorstWeekActive(config?.scoring_rules as DropWorstWeekRules, seasonYear);

  return {
    seasonYear,
    totals: page.entries,
    totalsCursor: page.nextCursor,
    championUserId,
    dropActive
  };
}

/**
 * The All-time (career) leaderboard tab (#376): `stats_alltime_totals` ranked with a
 * client-computed dense rank (no schema change — ADR-0013's matview keeps no `rank` column
 * for this surface) and enriched with each member's avatar, joined by `user_id` since the
 * matview carries none. Season-independent — no `seasonYear` param.
 *
 * Also composes the credibility ladder (#637): the rating is career-grain and season-independent
 * too, so this payload's scope IS the rating's scope, and riding this key keeps the ladder on the
 * same cache entry as the table it sits under. `player_ratings` is service-role-only, so the read
 * happens here and never from the browser (ADR-0032 §8). The ladder's roster is `players` — the
 * group MEMBERSHIP — rather than `allTimeTotals`: a member who has never had a pick graded has no
 * totals row, and must still read Unrated rather than vanish from their own league's ladder.
 */
export async function getAllTimeStandingsPayload(
  groupId: string
): Promise<AllTimeLeaderboardPayload> {
  const [allTimeTotals, players, config, ratings] = await Promise.all([
    getAllTimeTotals(groupId),
    getPlayers(groupId),
    getGroupConfig(groupId),
    getPlayerRatings(groupId)
  ]);

  const avatarByUserId = new Map(players.map((p) => [p.id, p.avatar_key]));
  const enriched = allTimeTotals.map((entry) => ({
    ...entry,
    avatar_key: avatarByUserId.get(entry.user_id) ?? null
  }));

  // Group-level (cross-season) flag, same as the Stats Career caption (ADR-0018): every
  // member's total_points already sums drop-aware season totals once this is true.
  const dropActive = isDropWorstWeekEnabled(config?.scoring_rules as DropWorstWeekRules);

  const ladder = ratingLadder(
    ratings,
    players.map((p) => ({
      user_id: p.id,
      display_name: p.display_name,
      avatar_key: p.avatar_key ?? null
    }))
  );

  return { totals: denseRankAllTime(enriched), dropActive, ladder };
}

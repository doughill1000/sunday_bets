// Shared composer for the shareable Group payload (ADR-0017).
//
// Used by both the `/group` page `load` (SSR `initialData`) and the `/api/group` read
// route (client revalidation) so the two paths cannot drift. Contains only non-sensitive,
// every-member-visible data — group name, members, league honors, identity badges.
// Commissioner-only data (invites, grading config, role flags) is NOT composed here; it
// stays on the page `load` and is never cached or persisted (boundary 3). Reuses existing
// query functions — no new SQL.
import { supabaseService } from '$lib/supabase/service';
import { getGroupMembersPage } from '$lib/server/db/queries/getGroupMembers';
import { getLeagueHonors } from '$lib/server/db/queries/honors';
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';
import type { GroupCachePayload } from '$lib/query/types';

export type { GroupCachePayload };

export async function getGroupCachePayload(
  groupId: string,
  seasonYear: number,
  opts: { membersCursor?: string | null } = {}
): Promise<GroupCachePayload> {
  const [groupResult, membersPage, honors, seasonStats, seasonTotals] = await Promise.all([
    supabaseService.from('groups').select('id, name').eq('id', groupId).single(),
    getGroupMembersPage(groupId, { cursor: opts.membersCursor ?? null }),
    getLeagueHonors(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  const { data: group, error: groupErr } = groupResult;
  if (groupErr || !group) throw groupErr ?? new Error('group not found');

  // Hot Hand switches from provisional (current_streak) to crowned (max_streak) when the
  // season is complete. A season is complete when it appears in the trophy case.
  const isSeasonComplete = honors.trophyCase.some((h) => h.season_year === seasonYear);

  // computeBadges is pure and reuses the rows just fetched (no extra round-trips).
  const badges = computeBadges(
    badgeInputsFromSeasonStats(seasonStats, seasonTotals),
    isSeasonComplete
  );

  return {
    group: { id: group.id, name: group.name },
    members: membersPage.members,
    membersCursor: membersPage.nextCursor,
    honors,
    badges
  };
}

// src/routes/(app)/group/+page.server.ts
// Group management page — members list, commissioner actions, invite minting.
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { getGroupConfig } from '$lib/server/groupConfig';
import { getGroupMembersPage } from '$lib/server/db/queries/getGroupMembers';
import { getLeagueHonors } from '$lib/server/db/queries/honors';
import { getSeasonLeaderboard, getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { groupId, user } = locals;
  if (!groupId || !user) throw redirect(303, '/auth/error?reason=no-group');

  // League Honors (#305): the Group tab is now the home for trophies, the wooden
  // spoon, and identity badges (moved off Stats). Champion/spoon come from
  // getLeagueHonors; badges derive from the selected season's stats + standings.
  //
  // Group name and current-user role run in the same block — neither depends on
  // badgeSeasonYear and they were the former sequential tail.
  const [currentSeasonYear, availableSeasons, groupResult, myMembershipResult] = await Promise.all([
    locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId),
    supabaseService.from('groups').select('id, name').eq('id', groupId).single(),
    supabaseService
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  const { data: group, error: groupErr } = groupResult;
  if (groupErr || !group) throw redirect(303, '/auth/error?reason=no-group');

  const isCommissioner = myMembershipResult.data?.role === 'commissioner';

  const badgeSeasonYear = resolveSeasonYear(
    url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  // Bounded, keyset-paginated members page (issue #152). Pass back `membersCursor`
  // as `?members_cursor=` to fetch the next page; for real groups the first page
  // already contains everyone, so output is unchanged.
  const [membersPage, honors, seasonStats, seasonTotals] = await Promise.all([
    getGroupMembersPage(groupId, { cursor: url.searchParams.get('members_cursor') }),
    getLeagueHonors(groupId),
    getStatsForSeason(badgeSeasonYear, groupId),
    getSeasonLeaderboard(badgeSeasonYear, groupId)
  ]);

  // computeBadges is pure and reuses the rows just fetched (no extra round-trips).
  const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals));

  // Load active invites if commissioner.
  let invites: {
    id: string;
    code: string;
    expires_at: string | null;
    max_uses: number | null;
    used_count: number;
    revoked_at: string | null;
    created_at: string;
  }[] = [];
  // League rules (commissioner-only): current values + season-freeze lock flag.
  let gradingPreset: 'house' | 'gamer' = 'house';
  let dropWorstWeek = false;
  let presetLocked = false;
  if (isCommissioner) {
    const [inviteResult, cfg, lockedResult] = await Promise.all([
      supabaseService
        .from('group_invites')
        .select('id, code, expires_at, max_uses, used_count, revoked_at, created_at')
        .eq('group_id', groupId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(20),
      getGroupConfig(groupId),
      supabaseService.rpc('group_active_season_settled', { p_group_id: groupId })
    ]);
    invites = inviteResult.data ?? [];
    gradingPreset = cfg?.grading_preset === 'gamer' ? 'gamer' : 'house';
    dropWorstWeek =
      (cfg?.scoring_rules as { drop_worst_week?: boolean } | null)?.drop_worst_week ?? false;
    presetLocked = lockedResult.data ?? false;
  }

  return {
    group,
    members: membersPage.members,
    membersCursor: membersPage.nextCursor,
    isCommissioner,
    currentUserId: user.id,
    honors,
    badges,
    availableSeasons,
    badgeSeasonYear,
    invites,
    gradingPreset,
    dropWorstWeek,
    presetLocked
  };
};

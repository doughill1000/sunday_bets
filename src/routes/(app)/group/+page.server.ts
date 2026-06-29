// src/routes/(app)/group/+page.server.ts
// Group management page — commissioner-only controls + season metadata.
//
// The shareable data (group name, members, league honors, identity badges) now comes from
// the client `createQuery` keyed by `(groupId, season)` so a revisit renders from cache and
// revalidates in the background (ADR-0017); `+page.ts` prefetches it on the server for a
// flash-free first paint. This load stays light and is the home of the commissioner-only,
// sensitive data — invites, grading config, role flags — which is NEVER cached or persisted
// to IndexedDB (boundary 3): it lives behind the `isCommissioner` check below.
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { getGroupConfig } from '$lib/server/groupConfig';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { resolveSeasonYear } from '$lib/server/seasonDefault';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { groupId, user } = locals;
  if (!groupId || !user) throw redirect(303, '/auth/error?reason=no-group');

  const [currentSeasonYear, availableSeasons, myMembershipResult] = await Promise.all([
    locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId),
    supabaseService
      .from('group_memberships')
      .select('role, ai_recap_opt_out')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  const isCommissioner = myMembershipResult.data?.role === 'commissioner';

  const badgeSeasonYear = resolveSeasonYear(
    url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  // Load active invites + league rules only for commissioners. This is sensitive, per-role
  // data and is deliberately kept off the cached/persisted query payload (ADR-0017).
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
  // AI recap settings (commissioner-only, issue #301, ADR-0008).
  let spice: 'mild' | 'medium' | 'spicy' = 'medium';
  let aiRecapsEnabled = true;
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
    const rawSpice = cfg?.spice;
    spice = rawSpice === 'mild' || rawSpice === 'spicy' ? rawSpice : 'medium';
    aiRecapsEnabled = cfg?.ai_recaps_enabled ?? true;
  }

  const aiRecapOptOut = myMembershipResult.data?.ai_recap_opt_out ?? false;

  return {
    groupId,
    isCommissioner,
    currentUserId: user.id,
    availableSeasons,
    badgeSeasonYear,
    invites,
    gradingPreset,
    dropWorstWeek,
    presetLocked,
    spice,
    aiRecapsEnabled,
    aiRecapOptOut
  };
};

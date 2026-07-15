// src/routes/(app)/league/manage/+page.server.ts
// Manage league console (#660, formerly the Members & manage subpage) — commissioner-only.
//
// #660 split this page by audience, which makes the ROUTE the authorization boundary: a
// non-commissioner has nothing here and is redirected to /league below. Every card the page
// renders is now a commissioner control, so the invites/config load is unconditional — the
// `if (isCommissioner)` guard that used to wrap it has become that redirect. The personal
// knobs (recap opt-out, leave league) moved to /settings.
//
// The shareable data (group name, members, league honors, identity badges) comes from the
// client `createQuery` keyed by `(groupId, season)` so a revisit renders from cache and
// revalidates in the background (ADR-0017); `+page.ts` prefetches it on the server for a
// flash-free first paint. This load stays light and is the home of the commissioner-only,
// sensitive data — invites, grading config — which is NEVER cached or persisted to
// IndexedDB (boundary 3).
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { getGroupConfig } from '$lib/server/groupConfig';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { resolveSeasonYear } from '$lib/server/seasonDefault';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { groupId, user } = locals;
  if (!groupId || !user) throw redirect(303, '/join');

  const [currentSeasonYear, availableSeasons, myMembershipResult] = await Promise.all([
    locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId),
    supabaseService
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  // The audience gate (#660). Read fresh from `group_memberships` rather than from
  // `locals.memberships` — that list is served from the ~30s auth-context cache (ADR-0014)
  // and is a UI hint, so a just-demoted commissioner could still hold a warm `commissioner`
  // entry. The /league entry button may use the cached hint; this boundary may not.
  if (myMembershipResult.data?.role !== 'commissioner') throw redirect(303, '/league');

  const badgeSeasonYear = resolveSeasonYear(
    url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  // Active invites + league rules. Sensitive commissioner data, deliberately kept off the
  // cached/persisted query payload (ADR-0017) — the redirect above is what gates it.
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

  const scoringRules = cfg?.scoring_rules as {
    drop_worst_week?: boolean;
    drop_worst_week_start_year?: number | null;
  } | null;
  const rawSpice = cfg?.spice;

  return {
    groupId,
    currentUserId: user.id,
    availableSeasons,
    badgeSeasonYear,
    // The active/upcoming season year — the default "apply from" season for a
    // freshly-enabled drop-worst-week rule (ADR-0018).
    currentSeasonYear,
    invites: inviteResult.data ?? [],
    gradingPreset: (cfg?.grading_preset === 'gamer' ? 'gamer' : 'house') as 'house' | 'gamer',
    dropWorstWeek: scoringRules?.drop_worst_week ?? false,
    // Season the drop applies from (ADR-0018): null until a commissioner commits to one,
    // which is what keeps the rule non-retroactive. Drives the "Apply from season" control.
    dropWorstWeekStartYear: scoringRules?.drop_worst_week_start_year ?? null,
    presetLocked: lockedResult.data ?? false,
    // AI recap settings (commissioner-only, issue #301, ADR-0008).
    spice: (rawSpice === 'mild' || rawSpice === 'spicy' ? rawSpice : 'medium') as
      'mild' | 'medium' | 'spicy',
    aiRecapsEnabled: cfg?.ai_recaps_enabled ?? true
  };
};

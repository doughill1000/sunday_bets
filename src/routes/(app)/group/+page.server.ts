// src/routes/(app)/group/+page.server.ts
// Group management page — members list, commissioner actions, invite minting.
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { getGroupConfig } from '$lib/server/groupConfig';

export const load: PageServerLoad = async ({ locals }) => {
  const { groupId, user } = locals;
  if (!groupId || !user) throw redirect(303, '/auth/error?reason=no-group');

  // Load members with their user profiles, ordered by role then display name.
  const { data: memberships, error: memErr } = await supabaseService
    .from('group_memberships')
    .select('user_id, role, joined_at, users!inner(id, display_name, avatar_key)')
    .eq('group_id', groupId)
    .order('role')
    .order('joined_at');

  if (memErr) throw new Error(memErr.message);

  // Load group name.
  const { data: group, error: groupErr } = await supabaseService
    .from('groups')
    .select('id, name')
    .eq('id', groupId)
    .single();

  if (groupErr || !group) throw redirect(303, '/auth/error?reason=no-group');

  // Check if the current user is a commissioner.
  const myMembership = memberships?.find((m) => m.user_id === user.id);
  const isCommissioner = myMembership?.role === 'commissioner';

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
    const { data: inviteData } = await supabaseService
      .from('group_invites')
      .select('id, code, expires_at, max_uses, used_count, revoked_at, created_at')
      .eq('group_id', groupId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(20);
    invites = inviteData ?? [];

    const cfg = await getGroupConfig(groupId);
    const { data: locked } = await supabaseService.rpc('group_active_season_settled', {
      p_group_id: groupId
    });
    gradingPreset = cfg?.grading_preset === 'gamer' ? 'gamer' : 'house';
    dropWorstWeek =
      (cfg?.scoring_rules as { drop_worst_week?: boolean } | null)?.drop_worst_week ?? false;
    presetLocked = locked ?? false;
  }

  return {
    group,
    members: (memberships ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      displayName: m.users.display_name ?? '',
      avatarKey: m.users.avatar_key ?? null
    })),
    isCommissioner,
    currentUserId: user.id,
    invites,
    gradingPreset,
    dropWorstWeek,
    presetLocked
  };
};

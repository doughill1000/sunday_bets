// POST /api/group/revoke-invite
// Sets revoked_at on the specified invite (commissioner only, enforced by RLS).
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const inviteId = typeof raw.inviteId === 'string' ? raw.inviteId : '';
  if (!inviteId) return json({ reason: 'inviteId is required' }, { status: 400 });

  // Verify the invite belongs to this group (defense in depth alongside RLS on group_invites).
  const { data: invite } = await supabaseService
    .from('group_invites')
    .select('id, group_id')
    .eq('id', inviteId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (!invite) return json({ reason: 'Invite not found.' }, { status: 404 });

  // Verify the caller is a commissioner (service role bypasses RLS so we check explicitly).
  const { data: membership } = await supabaseService
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership?.role !== 'commissioner') {
    return json({ reason: 'Only commissioners can revoke invites.' }, { status: 403 });
  }

  const { error } = await supabaseService
    .from('group_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (error) return json({ reason: 'Could not revoke invite.' }, { status: 500 });
  return json({ ok: true });
};

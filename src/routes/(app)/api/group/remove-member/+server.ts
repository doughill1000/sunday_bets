// POST /api/group/remove-member
// Calls remove_member RPC as the authenticated user (commissioner check in function).
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { invalidateAuthContext } from '$lib/server/auth-context-cache';

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can remove members.';
  if (code === 'P0021') return 'That user is not a member of this group.';
  if (code === 'P0022') return 'Cannot remove the last commissioner. Promote another member first.';
  if (code === 'P0023') return 'Use "Leave group" to remove yourself.';
  return 'Could not remove member.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof raw.userId === 'string' ? raw.userId : '';
  if (!userId) return json({ reason: 'userId is required' }, { status: 400 });

  const { error } = await supabase.rpc('remove_member', {
    p_group_id: groupId,
    p_user_id: userId
  });

  if (error) {
    return json({ reason: errReason(error.code) }, { status: 400 });
  }

  // Best-effort bust of the removed member's cached memberships on this instance
  // (ADR-0014). The cache is per-instance, so this only shortens the staleness
  // window where the actor and target share a warm instance; the ≤TTL app-shell
  // bound still applies cross-instance (data stays RLS-denied regardless).
  invalidateAuthContext(userId);

  return json({ ok: true });
};

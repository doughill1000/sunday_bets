// POST /api/group/promote-member
// Calls promote_member RPC as the authenticated user (commissioner check in function).
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can promote members.';
  if (code === 'P0021') return 'That user is not a member of this group.';
  if (code === 'P0024') return 'That member is already a commissioner.';
  return 'Could not promote member.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = typeof raw.userId === 'string' ? raw.userId : '';
  if (!userId) return json({ reason: 'userId is required' }, { status: 400 });

  const { error } = await supabase.rpc('promote_member', {
    p_group_id: groupId,
    p_user_id: userId
  });

  if (error) {
    return json({ reason: errReason(error.code) }, { status: 400 });
  }

  return json({ ok: true });
};

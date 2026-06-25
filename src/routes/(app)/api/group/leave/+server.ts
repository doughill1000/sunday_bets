// POST /api/group/leave
// Calls leave_group RPC as the authenticated user (last-commissioner guard in function).
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

function errReason(code: string | undefined): string {
  if (code === 'P0021') return 'You are not a member of this group.';
  if (code === 'P0022')
    return 'Cannot leave as the last commissioner. Promote another member to commissioner first.';
  return 'Could not leave the group.';
}

export const POST: RequestHandler = async ({ locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase.rpc('leave_group', {
    p_group_id: groupId
  });

  if (error) {
    return json({ reason: errReason(error.code) }, { status: 400 });
  }

  return json({ ok: true });
};

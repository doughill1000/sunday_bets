// POST /api/group/mint-invite
// Calls mint_invite RPC as the authenticated user (commissioner check in function).
// Returns the generated invite code so the UI can display the full invite URL.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can create invites.';
  return 'Could not create invite.';
}

export const POST: RequestHandler = async ({ locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const { data: code, error } = await supabase.rpc('mint_invite', {
    p_group_id: groupId
  });

  if (error) {
    return json({ reason: errReason(error.code) }, { status: 400 });
  }

  return json({ ok: true, code });
};

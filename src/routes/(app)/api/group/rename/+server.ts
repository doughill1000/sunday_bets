// POST /api/group/rename
// Calls the rename_group RPC as the authenticated user (RLS enforced in function).
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

function errReason(code: string | undefined): string {
  if (code === 'P0010') return 'Group name is required.';
  if (code === 'P0011') return 'Group name must be 60 characters or fewer.';
  if (code === 'P0020') return 'Only commissioners can rename the group.';
  return 'Could not rename the group.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name : '';

  const { error } = await supabase.rpc('rename_group', {
    p_group_id: groupId,
    p_name: name
  });

  if (error) {
    return json({ reason: errReason(error.code) }, { status: 400 });
  }

  return json({ ok: true });
};

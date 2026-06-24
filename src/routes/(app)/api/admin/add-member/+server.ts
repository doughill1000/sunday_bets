import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { addGroupMember } from '$lib/server/db/commands/addGroupMember';

const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  try {
    const { email, displayName, password, groupId } = await event.request.json();

    if (!email || typeof email !== 'string') {
      return json({ ok: false, reason: 'email is required' }, { status: 400 });
    }
    if (!displayName || typeof displayName !== 'string') {
      return json({ ok: false, reason: 'displayName is required' }, { status: 400 });
    }

    const result = await addGroupMember({
      email,
      displayName,
      password: password || undefined,
      groupId: groupId || ORIGINAL_GROUP_ID
    });

    return json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ ok: false, reason: msg }, { status: 500 });
  }
};

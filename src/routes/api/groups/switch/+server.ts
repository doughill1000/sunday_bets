// src/routes/api/groups/switch/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { ACTIVE_GROUP_COOKIE } from '$lib/server/group-resolver';

/**
 * POST /api/groups/switch
 * Body: { groupId: string }
 *
 * Sets the active_group_id cookie to the requested group, but only if the
 * authenticated user actually has an active membership in that group.
 * Returns 401 for unauthenticated requests, 403 for groups the user is not
 * a member of, and 200 with { ok: true } on success.
 */
export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
  const { user } = await locals.safeGetSession();
  if (!user) {
    return json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: 'invalid JSON' }, { status: 400 });
  }

  const groupId =
    typeof body === 'object' && body !== null && 'groupId' in body
      ? String((body as { groupId: unknown }).groupId)
      : null;

  if (!groupId) {
    return json({ ok: false, reason: 'groupId is required' }, { status: 400 });
  }

  // Validate: the user must have an active membership in the requested group.
  const isMember = locals.memberships.some((m) => m.groupId === groupId);
  if (!isMember) {
    return json({ ok: false, reason: 'not a member of that group' }, { status: 403 });
  }

  cookies.set(ACTIVE_GROUP_COOKIE, groupId, {
    path: '/',
    secure: url.protocol === 'https:',
    httpOnly: true,
    sameSite: 'lax',
    // Persist for 1 year — stays valid across PWA relaunches.
    maxAge: 60 * 60 * 24 * 365
  });

  return json({ ok: true });
};

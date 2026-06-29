// GET /api/group?groupId=&season= — validated-param read route backing the client Group
// cache (ADR-0017). Returns only the shareable Group payload (group name, members, honors,
// badges); commissioner-only data (invites, config, role flags) is never served here. The
// existing mutation subroutes (rename, mint-invite, …) live alongside as separate files.
import { json, type RequestHandler } from '@sveltejs/kit';
import { guardGroupScopedRead } from '$lib/server/api/groupScopedRead';
import { getGroupCachePayload } from '$lib/server/readModels/groupCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const guard = guardGroupScopedRead(locals, url);
  if (!guard.ok) return guard.response;

  const payload = await getGroupCachePayload(guard.groupId, guard.seasonYear, {
    membersCursor: url.searchParams.get('members_cursor')
  });
  return json(payload);
};

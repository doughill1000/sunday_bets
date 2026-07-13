// GET /api/recap?groupId=&season= — validated-param read route backing the client Recap
// cache (ADR-0033, issue #602). Returns recent recap prose + the season's weekly-hardware
// awards/shelf; membership-scoped via the shared ADR-0017 guard.
import { json, type RequestHandler } from '@sveltejs/kit';
import { guardGroupScopedRead } from '$lib/server/api/groupScopedRead';
import { getRecapCachePayload } from '$lib/server/readModels/recapCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const guard = guardGroupScopedRead(locals, url);
  if (!guard.ok) return guard.response;

  const payload = await getRecapCachePayload(guard.groupId, guard.seasonYear);
  return json(payload);
};

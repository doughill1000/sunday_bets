// GET /api/stats?groupId=&season= — validated-param read route backing the client
// Stats cache (ADR-0017). Returns the same eager payload the `/stats` page load seeds as
// `initialData`; membership-scoped via the shared guard.
import { json, type RequestHandler } from '@sveltejs/kit';
import { guardGroupScopedRead } from '$lib/server/api/groupScopedRead';
import { getStatsCachePayload } from '$lib/server/readModels/statsCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const guard = guardGroupScopedRead(locals, url);
  if (!guard.ok) return guard.response;

  const payload = await getStatsCachePayload(guard.groupId, guard.seasonYear);
  return json(payload);
};

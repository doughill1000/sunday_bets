// GET /api/league?season= — validated-param read route backing the client League cache
// (ADR-0017, issue #406). Returns the same payload the `/league` page load seeds as
// `initialData`. League ATS is league-wide, descriptive context with no group/user
// dimension, so this authenticates but takes no `groupId` (nothing to scope) — the read is
// still service-role and behind auth.
import { json, type RequestHandler } from '@sveltejs/kit';
import { getLeagueCachePayload } from '$lib/server/readModels/leagueCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const seasonRaw = url.searchParams.get('season');
  const seasonYear = seasonRaw != null ? Number(seasonRaw) : NaN;
  if (!Number.isInteger(seasonYear)) {
    return json({ error: 'season is required' }, { status: 400 });
  }

  const payload = await getLeagueCachePayload(seasonYear);
  return json(payload);
};

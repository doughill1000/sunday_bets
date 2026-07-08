// GET /api/league/slate?season= — validated-param read route backing the week-sensitive
// League slate cache (ADR-0017, issue #429). Returns the same payload the `/league` page
// load seeds as `initialData`. Like /api/league this authenticates but takes no `groupId`
// (the slate is league-wide, group-independent). Unlike /api/league the payload is week- and
// line-sensitive, so its client query is keyed and revalidated separately (not persisted).
import { json, type RequestHandler } from '@sveltejs/kit';
import { getLeagueSlate } from '$lib/server/db/queries/league';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const seasonRaw = url.searchParams.get('season');
  const seasonYear = seasonRaw != null ? Number(seasonRaw) : NaN;
  if (!Number.isInteger(seasonYear)) {
    return json({ error: 'season is required' }, { status: 400 });
  }

  const payload = await getLeagueSlate(seasonYear);
  return json(payload);
};

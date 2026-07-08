// GET /api/league/trends — read route backing the pooled "Last N seasons" League trends cache
// (ADR-0017, epic #424). Returns the market-cut counts summed across the recent seasons. Like
// /api/league it authenticates but takes no `groupId` (league-wide, group-independent); unlike
// it, it takes no `season` param either — the payload deliberately spans the recent seasons, so
// its client query is keyed and revalidated on its own `['league','trends']` root.
import { json, type RequestHandler } from '@sveltejs/kit';
import { getLeagueTrends } from '$lib/server/db/queries/league';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const payload = await getLeagueTrends();
  return json(payload);
};

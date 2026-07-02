// GET /api/leaderboard/alltime?groupId= — validated-param read route backing the client
// All-time (career) leaderboard cache (ADR-0017, #376). Season-independent (no `season`
// param), so it uses the group-only guard rather than `guardGroupScopedRead`. Returns the
// shareable, dense-ranked `stats_alltime_totals` payload — identical for every member.
import { json, type RequestHandler } from '@sveltejs/kit';
import { guardGroupRead } from '$lib/server/api/groupScopedRead';
import { getAllTimeStandingsPayload } from '$lib/server/readModels/leaderboardCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const guard = guardGroupRead(locals, url);
  if (!guard.ok) return guard.response;

  const payload = await getAllTimeStandingsPayload(guard.groupId);
  return json(payload);
};

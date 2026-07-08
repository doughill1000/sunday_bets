// GET /api/league/team?teamId=&season= — lazy per-team game log for the /league drill-down
// (issue #428). Sibling of /api/league: authenticated, service-role, no groupId (league ATS is
// league-wide context with no group/user dimension). Fetched only when a team's drill-down
// opens, so it is a separate route rather than a field on the season-wide /api/league payload.
import { json, type RequestHandler } from '@sveltejs/kit';
import { getLeagueTeamGameLog } from '$lib/server/db/queries/league';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const seasonRaw = url.searchParams.get('season');
  const teamRaw = url.searchParams.get('teamId');
  const seasonYear = seasonRaw != null ? Number(seasonRaw) : NaN;
  const teamId = teamRaw != null ? Number(teamRaw) : NaN;
  if (!Number.isInteger(seasonYear)) {
    return json({ error: 'season is required' }, { status: 400 });
  }
  if (!Number.isInteger(teamId)) {
    return json({ error: 'teamId is required' }, { status: 400 });
  }

  const payload = await getLeagueTeamGameLog(seasonYear, teamId);
  return json(payload);
};

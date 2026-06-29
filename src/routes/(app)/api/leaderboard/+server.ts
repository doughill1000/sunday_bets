// GET /api/leaderboard?groupId=&season=&cursor= — validated-param read route backing the
// client Leaderboard standings cache (ADR-0017). Returns only the shareable standings (the
// same payload the `/leaderboard` page load seeds as `initialData`); the user-specific
// Weekly breakdown is never served here. Membership-scoped via the shared guard.
import { json, type RequestHandler } from '@sveltejs/kit';
import { guardGroupScopedRead } from '$lib/server/api/groupScopedRead';
import { getLeaderboardStandingsPayload } from '$lib/server/readModels/leaderboardCache';

export const GET: RequestHandler = async ({ locals, url }) => {
  const guard = guardGroupScopedRead(locals, url);
  if (!guard.ok) return guard.response;

  const currentSeasonYear = await locals.getCurrentSeasonYear();
  const payload = await getLeaderboardStandingsPayload(
    guard.groupId,
    guard.seasonYear,
    currentSeasonYear,
    { cursor: url.searchParams.get('cursor') }
  );
  return json(payload);
};

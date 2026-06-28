import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  getCurrentSeasonYear,
  getSeasonLeaderboard,
  getAvailableSeasons
} from '$lib/server/db/queries/leaderboard';
import {
  getStatsForSeason,
  getAllTimeTotals,
  getAllTimeDetail
} from '$lib/server/db/queries/stats';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad, traceDbQuery } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  return tracePageLoad('stats', () => loadStats(event, groupId));
};

async function loadStats(event: Parameters<PageServerLoad>[0], groupId: string) {
  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(
    event.url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  const [allTimeTotals, stats, totals] = await Promise.all([
    getAllTimeTotals(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId)
  ]);

  return {
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    currentUserId: event.locals.user?.id ?? null,
    totals,
    allTimeTotals,
    // Streamed (un-awaited): the Career / Head-to-head detail is not needed for first
    // paint, so it loads off the critical path. Traced separately from `load stats`.
    allTimeDetail: traceDbQuery('stats.alltime-detail', () => getAllTimeDetail(groupId)),
    ...stats
  };
}

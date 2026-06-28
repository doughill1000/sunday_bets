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
import { getLeagueHonors } from '$lib/server/db/queries/honors';
import { computeBadges, badgeInputsFromSeasonStats } from '$lib/domain/badges';
import { tracePageLoad, traceDbQuery } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  return tracePageLoad('stats', () => loadStats(event, groupId));
};

async function loadStats(event: Parameters<PageServerLoad>[0], groupId: string) {
  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const currentSeasonYear = await getCurrentSeasonYear();

  const rawSeason = event.url.searchParams.get('season');
  const seasonYear = rawSeason ? parseInt(rawSeason, 10) || currentSeasonYear : currentSeasonYear;

  const [availableSeasons, allTimeTotals, stats, totals, honors] = await Promise.all([
    getAvailableSeasons(groupId),
    getAllTimeTotals(groupId),
    getStatsForSeason(seasonYear, groupId),
    getSeasonLeaderboard(seasonYear, groupId),
    getLeagueHonors(groupId)
  ]);

  // Badges reuse the season rows just fetched (no extra round-trips); computeBadges is pure.
  const badges = computeBadges(badgeInputsFromSeasonStats(stats, totals));

  return {
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    currentUserId: event.locals.user?.id ?? null,
    totals,
    honors,
    badges,
    allTimeTotals,
    // Streamed (un-awaited): the Career / Head-to-head detail is not needed for first
    // paint, so it loads off the critical path. Traced separately from `load stats`.
    allTimeDetail: traceDbQuery('stats.alltime-detail', () => getAllTimeDetail(groupId)),
    ...stats
  };
}

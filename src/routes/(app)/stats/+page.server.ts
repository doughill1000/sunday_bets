import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { getAllTimeDetail } from '$lib/server/db/queries/stats';
import { isSeasonInProgress } from '$lib/server/db/queries/seasonProgress';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad, traceDbQuery } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/join');

  return tracePageLoad('stats', () => loadStats(event, groupId));
};

async function loadStats(event: Parameters<PageServerLoad>[0], groupId: string) {
  const seasonParam = event.url.searchParams.get('season');

  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // #638: the newest season only keeps the "This season" pin / 'season' default while it's
  // actually in progress (a real weeks-based signal — see seasonProgress.ts), rather than
  // just being the most recent one with standings. Folded with `seasonYear` the same way the
  // client derives `scopeOptions`, so a brand-new season with no standings yet is still
  // checked correctly. An explicit `?season=` always wins the initial scope regardless — the
  // visitor asked for that season, not the default.
  const latestSeasonInProgress = await isSeasonInProgress(
    Math.max(seasonYear, ...availableSeasons)
  );
  const defaultScope: 'season' | 'career' =
    seasonParam != null || latestSeasonInProgress ? 'season' : 'career';

  // The heavy, season-scoped Stats payload (totals / accuracy / head-to-head) is no longer
  // composed here: it moves to the client `createQuery` keyed by `(groupId, season)` so a
  // revisit renders from cache and revalidates in the background (ADR-0017). This load
  // stays light — just the season metadata needed to build the query key plus the streamed
  // career detail — so navigation is not blocked on the aggregation. `+page.ts` prefetches
  // the payload on the server for a flash-free first paint.
  return {
    groupId,
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    latestSeasonInProgress,
    defaultScope,
    currentUserId: event.locals.user?.id ?? null,
    // Streamed (un-awaited): the Career / Head-to-head detail is not needed for first
    // paint, so it loads off the critical path. Traced separately from `load stats`.
    // Not cached client-side — refreshes on full navigation only.
    allTimeDetail: traceDbQuery('stats.alltime-detail', () => getAllTimeDetail(groupId))
  };
}

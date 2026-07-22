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
  const scopeParam = event.url.searchParams.get('scope');

  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // Whether the newest season is actually in progress — a real weeks-based signal (see
  // seasonProgress.ts), not just "has the most recent standings". Folded with `seasonYear` the
  // same way the client derives `scopeOptions`, so a brand-new season with no standings yet is
  // still checked correctly. Its only job now is labelling the season pin honestly ("This
  // season · YYYY" vs "Last season · YYYY", #638/#737); it no longer picks the scope.
  const latestSeasonInProgress = await isSeasonInProgress(
    Math.max(seasonYear, ...availableSeasons)
  );

  // #738: a bare visit always opens on a season, in every month ("default to the last graded
  // thing", DESIGN.md, first applied by #737 on /league). The old rule (#638) flipped an
  // offseason visit to Career, so the same URL rendered a different page either side of a
  // calendar date nobody saw, and the season the league spends seven months talking about was
  // never what /stats opened on. Career is now only ever an explicit choice — via the dropdown,
  // or via `?scope=career`, which mirrors /league's `?scope=alltime` so the career window is a
  // shareable URL rather than an unaddressable client flip. That matters more here than there:
  // Career is the rating's canonical home (ADR-0032), and it just stopped being a scope anyone
  // lands on by accident. The rating itself is no longer default-hidden either way — the season
  // hero now carries the career-rating chip.
  const defaultScope: 'season' | 'career' = scopeParam === 'career' ? 'career' : 'season';

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

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons, getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
import { getWrappedSeasons } from '$lib/server/db/queries/seasonWrapped';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { isActiveWeekLive } from '$lib/server/liveScores';
import { isSeasonInProgress } from '$lib/server/db/queries/seasonProgress';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/join');

  return tracePageLoad('league', () => loadLeagueHome(event, groupId));
};

async function loadLeagueHome(event: Parameters<PageServerLoad>[0], groupId: string) {
  const viewParam = event.url.searchParams.get('view');
  const seasonParam = event.url.searchParams.get('season');
  const weekParam = event.url.searchParams.get('week');

  // Wayfinding (#584, Move 5): a bare `/league` visit opens on the Weekly tab while a game is
  // in its live window, and on Standings the rest of the week. An explicit `?view=` or a past
  // `?season=` is always honoured, so the check only runs (and only costs a query) on a bare
  // visit. Parallelised with the standing load so it adds no latency.
  const wantLiveDefault = viewParam == null && seasonParam == null;

  const [currentSeasonYear, availableSeasons, wrappedSeasons, liveDefaultWeekly] =
    await Promise.all([
      event.locals.getCurrentSeasonYear(),
      getAvailableSeasons(groupId),
      getWrappedSeasons(groupId),
      wantLiveDefault ? isActiveWeekLive() : Promise.resolve(false)
    ]);

  const view = viewParam ?? (liveDefaultWeekly ? 'weekly' : 'standings');

  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // The most-recent completed season that has a generated Wrapped drives the seasonal CTA
  // (WrappedPromo). null when no Wrapped exists yet (in-season / before backfill). The promo
  // is its own dismissable surface, so it shows regardless of the standings season in view.
  const latestWrappedSeason = wrappedSeasons[0] ?? null;

  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const currentUserId = event.locals.user?.id ?? null;

  // The season race chart and the standings rank-movement arrows (#561) both read the season
  // trend (`stats_season_trend`): every member's cumulative points and rank by graded week. It's
  // small, shareable, and season-scoped; loaded unconditionally (not just on the standings branch)
  // so the race chart still has its rows when the user flips back from the Weekly tab without a
  // reload. Only ever holds rows for graded weeks, which is exactly the chart's "≥1 graded week"
  // gate. All-time scope is a pure client flip that hides both, so no all-time trend is needed.
  //
  // #638: the newest season only keeps the "This season" pin / 'season' default while it's
  // actually in progress (a real weeks-based signal — see seasonProgress.ts), rather than just
  // being the most recent one with standings. Folded with `seasonYear` the same way the client
  // derives `scopeOptions`, so a brand-new season with no standings yet is still checked
  // correctly. An explicit `?season=` always wins the initial scope regardless.
  const [trend, latestSeasonInProgress] = await Promise.all([
    getWeeklyCumulative(seasonYear, groupId),
    isSeasonInProgress(Math.max(seasonYear, ...availableSeasons))
  ]);
  const defaultScope: 'season' | 'alltime' =
    seasonParam != null || latestSeasonInProgress ? 'season' : 'alltime';

  // Season standings (shareable) come from the client `createQuery` keyed by `(groupId, season)`
  // so a revisit renders from cache (ADR-0017); `+page.ts` prefetches them on the server for a
  // flash-free first paint. This load stays light. For the Weekly view only it composes the
  // user-specific, RLS-gated pick breakdown — read through the user-scoped client with a kickoff
  // gate, so it differs per user and is NEVER cached or persisted (boundary 3); it stays here.
  if (view !== 'weekly') {
    return {
      groupId,
      currentSeasonYear,
      seasonYear,
      availableSeasons,
      latestSeasonInProgress,
      defaultScope,
      latestWrappedSeason,
      currentUserId,
      trend,
      view: 'standings' as const,
      weeks: null,
      selectedWeek: null,
      breakdown: null
    };
  }

  const weeks = await getSeasonWeekOptions(seasonYear);
  const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const selectedWeekNumber =
    weekParam != null ? Number(weekParam) : (latestWeek?.weekNumber ?? null);
  const selectedWeek = weeks.find((w) => w.weekNumber === selectedWeekNumber) ?? latestWeek;

  const breakdown =
    selectedWeek != null
      ? await getWeeklyPickBreakdown(event, selectedWeek.weekId, groupId, currentUserId)
      : [];

  return {
    groupId,
    currentSeasonYear,
    seasonYear,
    availableSeasons,
    latestSeasonInProgress,
    defaultScope,
    latestWrappedSeason,
    currentUserId,
    trend,
    view: 'weekly' as const,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
}

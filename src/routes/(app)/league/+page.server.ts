import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons, getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
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
  const scopeParam = event.url.searchParams.get('scope');

  // Wayfinding (#584, Move 5): a bare `/league` visit opens on the Weekly tab while a game is
  // in its live window, and on Standings the rest of the week. An explicit `?view=` or a past
  // `?season=` is always honoured, so the check only runs (and only costs a query) on a bare
  // visit. Parallelised with the standing load so it adds no latency.
  const wantLiveDefault = viewParam == null && seasonParam == null;

  const [currentSeasonYear, availableSeasons, liveDefaultWeekly] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId),
    wantLiveDefault ? isActiveWeekLive() : Promise.resolve(false)
  ]);

  const view = viewParam ?? (liveDefaultWeekly ? 'weekly' : 'standings');

  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const currentUserId = event.locals.user?.id ?? null;

  // Whether to show the "Manage" entry (#660). Read off the memberships the auth hook already
  // resolved, so this costs no query. It's a UI hint only and may lag a role change by the
  // auth-context cache TTL (~30s, ADR-0014) — /league/manage's own load re-reads the role
  // fresh and redirects, so a stale `true` shows a button that bounces, never a leaked control.
  const isCommissioner =
    event.locals.memberships.find((m) => m.groupId === groupId)?.role === 'commissioner';

  // The season race chart and the standings rank-movement arrows (#561) both read the season
  // trend (`stats_season_trend`): every member's cumulative points and rank by graded week. It's
  // small, shareable, and season-scoped; loaded unconditionally (not just on the standings branch)
  // so the race chart still has its rows when the user flips back from the Weekly tab without a
  // reload. Only ever holds rows for graded weeks, which is exactly the chart's "≥1 graded week"
  // gate. All-time scope is a pure client flip that hides both, so no all-time trend is needed.
  //
  // #638/#737: the newest season only earns the "This season" pin while it's actually in
  // progress (a real weeks-based signal — see seasonProgress.ts), rather than just being the
  // most recent one with standings. `currentSeasonYear` is folded into the check (#737) so the
  // pin is offered from schedule-seed — in the week-1 window (new season seeded, nothing graded)
  // the newest KNOWN season is the seeded one, not the newest one with standings — while the
  // *default* season stays the last graded one until week 1 grades (`resolveSeasonYear` above).
  //
  // `viewedSeasonInProgress` drives the crowned-season block order on the client (#737):
  // a concluded season leads with its honors, an in-progress one with the table. It's about the
  // season IN VIEW, which an explicit `?season=` can point years back — data-keyed, not
  // calendar-keyed, so the same season's page renders identically in July and November.
  const newestKnownSeason = Math.max(currentSeasonYear, seasonYear, ...availableSeasons);
  const [trend, latestSeasonInProgress, viewedSeasonInProgressRaw] = await Promise.all([
    getWeeklyCumulative(seasonYear, groupId),
    isSeasonInProgress(newestKnownSeason),
    seasonYear === newestKnownSeason ? null : isSeasonInProgress(seasonYear)
  ]);
  const viewedSeasonInProgress = viewedSeasonInProgressRaw ?? latestSeasonInProgress;

  // #737: a bare `/league` visit always opens on the season window — offseason included, where
  // the default season is the last graded one and its honors are the page's lead content. The
  // All-time window is an explicit, shareable choice via `?scope=alltime` (the old behaviour
  // defaulted offseason visits to All-time, hiding champion/spoon/titles for seven months).
  const defaultScope: 'season' | 'alltime' = scopeParam === 'alltime' ? 'alltime' : 'season';

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
      viewedSeasonInProgress,
      defaultScope,
      currentUserId,
      isCommissioner,
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
    viewedSeasonInProgress,
    defaultScope,
    currentUserId,
    isCommissioner,
    trend,
    view: 'weekly' as const,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
}

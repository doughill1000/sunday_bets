import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons, getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
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
  const scopeParam = event.url.searchParams.get('scope');

  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  // Two lanes since #776 promoted Week to its own top-level nav destination (retiring #584's
  // `liveDefaultWeekly` auto-flip): Standings is the unconditional default, Honors is reached only
  // explicitly — by tab tap or `?view=honors`. A bookmarked `?view=weekly` never reaches this load
  // — hooks.server.ts permanently redirects it to /week before auth — so Standings is the sole
  // computed default now, live window or not.
  const view: 'standings' | 'honors' = viewParam === 'honors' ? 'honors' : 'standings';

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
  // flash-free first paint. This load stays light: both remaining lanes ride shareable client
  // caches (Standings the leaderboard/all-time payloads, Honors the group + recap caches, the
  // latter prefetched by `+page.ts` only on a `?view=honors` request so the trophy shelf SSRs
  // without a flash). The user-scoped weekly pick breakdown moved to /week's own server load (#776).
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
    view
  };
}

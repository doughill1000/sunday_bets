import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  return tracePageLoad('leaderboard', () => loadLeaderboard(event, groupId));
};

async function loadLeaderboard(event: Parameters<PageServerLoad>[0], groupId: string) {
  const view = event.url.searchParams.get('view') ?? 'standings';
  const weekParam = event.url.searchParams.get('week');

  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(
    event.url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  // The hook (injectSession) already validated the JWT via safeGetSession, so trust
  // locals.user instead of a second auth.getUser() round-trip.
  const currentUserId = event.locals.user?.id ?? null;

  // Season standings (shareable) now come from the client `createQuery` keyed by
  // `(groupId, season)` so a revisit renders from cache (ADR-0017); `+page.ts` prefetches
  // them on the server for a flash-free first paint. This load stays light. For the Weekly
  // view only it composes the user-specific, RLS-gated pick breakdown — which is read
  // through the user-scoped client with a kickoff gate, so it differs per user and is NEVER
  // cached or persisted (boundary 3); it stays here on the server load.
  if (view !== 'weekly') {
    return {
      groupId,
      currentSeasonYear,
      seasonYear,
      availableSeasons,
      currentUserId,
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
    currentUserId,
    view: 'weekly' as const,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
}

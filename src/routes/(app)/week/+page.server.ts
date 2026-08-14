import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { resolveLiveSeasonYear } from '$lib/server/seasonDefault';
import { findStartedSeasonYear } from '$lib/server/db/queries/findStartedSeasonYear';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/join');

  return tracePageLoad('week', () => loadWeek(event, groupId));
};

// The Week destination (#776): promoted out of `/league`'s third tab to its own top-level nav
// slot, so the highest-frequency, most time-sensitive surface is one tap from anywhere. This is a
// lift-and-shift of the old `?view=weekly` branch — same components, same user-scoped server
// boundary (ADR-0017) — not a redesign. `/league?view=weekly` permanently redirects here
// (hooks.server.ts), preserving `week`/`season`, so the shareable-URL contract survives the move.
async function loadWeek(event: Parameters<PageServerLoad>[0], groupId: string) {
  const seasonParam = event.url.searchParams.get('season');
  const weekParam = event.url.searchParams.get('week');

  const [currentSeasonYear, availableSeasons, startedSeasonYear] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId),
    findStartedSeasonYear()
  ]);

  // Default to the season that is actually in play, not the last graded one (#824). Week is the
  // "what just happened" surface, so it anchors on a started week the way /picks anchors on
  // `findActiveWeek()` — the six browse surfaces keep `resolveSeasonYear`'s last-graded default.
  // The distinction is invisible mid-season and decisive in August: a preseason round is
  // non-scoring, so per ADR-0016 it contributes no matview rows and its season never enters
  // `availableSeasons`, which left the live round unreachable without hand-editing the URL.
  // Falls back to that same last-graded default when no week has started (the true off-season),
  // so the empty-summer guard survives; an explicit `?season=` — the form a
  // `/league?view=weekly&season=` bookmark redirects into — still wins over both, so deep links
  // land on the season they named.
  const seasonYear = resolveLiveSeasonYear(
    seasonParam,
    startedSeasonYear,
    availableSeasons,
    currentSeasonYear
  );

  // The hook (injectSession) already validated the JWT, so trust locals.user rather than a
  // second auth.getUser() round-trip.
  const currentUserId = event.locals.user?.id ?? null;

  const weeks = await getSeasonWeekOptions(seasonYear);
  const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const selectedWeekNumber =
    weekParam != null ? Number(weekParam) : (latestWeek?.weekNumber ?? null);
  const selectedWeek = weeks.find((w) => w.weekNumber === selectedWeekNumber) ?? latestWeek;

  // The user-specific, RLS-gated pick breakdown, read through the user-scoped client with a
  // kickoff gate (boundary 3): it differs per user and is NEVER cached or persisted, so it stays
  // on the server load rather than a shareable client query. The week's hardware, by contrast,
  // rides the shareable recap cache (`+page.ts` prefetches it for a flash-free first paint).
  const breakdown =
    selectedWeek != null
      ? await getWeeklyPickBreakdown(event, selectedWeek.weekId, groupId, currentUserId)
      : [];

  return {
    groupId,
    currentUserId,
    seasonYear,
    weeks,
    selectedWeek: selectedWeek ?? null,
    breakdown
  };
}

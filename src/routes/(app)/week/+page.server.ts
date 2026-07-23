import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { getSeasonWeekOptions, getWeeklyPickBreakdown } from '$lib/server/weeklyPicks';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
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

  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  // Default to the last graded season (#737's "default to the last graded thing"): Schedule Sync
  // seeds the upcoming season months early, so the calendar season would show empty rows. An
  // explicit `?season=` — the form a `/league?view=weekly&season=` bookmark redirects into — is
  // always honoured so deep links land on the season they named.
  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

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

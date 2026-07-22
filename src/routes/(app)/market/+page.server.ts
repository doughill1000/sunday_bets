import type { PageServerLoad } from './$types';
import { getLeagueSeasons } from '$lib/server/db/queries/league';
import { isSeasonInProgress } from '$lib/server/db/queries/seasonProgress';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  return tracePageLoad('teams', () => loadTeams(event));
};

async function loadTeams(event: Parameters<PageServerLoad>[0]) {
  const seasonParam = event.url.searchParams.get('season');

  // Auth is enforced by (app)/+layout.server.ts. League data is league-wide and
  // group-independent, so this load needs no groupId — just the season metadata used to
  // build the query key. The heavy ATS payload is fetched by `+page.ts` (SSR) / the
  // client `createQuery` (revalidation) via `/api/league` (ADR-0017).
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getLeagueSeasons()
  ]);

  // The lean page (#692) has no scope control: the team book reads the last graded thing —
  // the most recent season with data (the DESIGN.md rule #737 named) — and the caption states
  // the window instead of a dropdown offering five. `?season=` stays as the one explicit,
  // URL-addressable alternate window.
  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // Whether the season in view is still being played, for the honest caption ("through
  // Week N" vs "final") — not for any scope-flipping logic (#638's defaultScope died with
  // the dropdown).
  const seasonInProgress = await isSeasonInProgress(seasonYear);

  return { currentSeasonYear, seasonYear, seasonInProgress };
}

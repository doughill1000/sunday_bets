import type { PageServerLoad } from './$types';
import { getLeagueSeasons } from '$lib/server/db/queries/league';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  return tracePageLoad('league', () => loadLeague(event));
};

async function loadLeague(event: Parameters<PageServerLoad>[0]) {
  // Auth is enforced by (app)/+layout.server.ts. League data is league-wide and
  // group-independent, so this load needs no groupId — just the season metadata used to
  // build the query key. The heavy ATS payload is fetched by `+page.ts` (SSR) / the
  // client `createQuery` (revalidation) via `/api/league` (ADR-0017).
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getLeagueSeasons()
  ]);

  const seasonYear = resolveSeasonYear(
    event.url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  // The Teams-tab season picker drives `seasonYear`, but the Trends tab pins its "This season"
  // scope to `defaultSeasonYear` — the most recent season with data, independent of the picker —
  // so browsing an older season in Teams doesn't drag Trends back with it (and it survives the
  // offseason, unlike raw `currentSeasonYear`). On the default view the two coincide, so the
  // Trends query dedupes onto the same key as the Teams query (no extra fetch).
  const defaultSeasonYear = resolveSeasonYear(null, availableSeasons, currentSeasonYear);

  return { currentSeasonYear, seasonYear, defaultSeasonYear, availableSeasons };
}

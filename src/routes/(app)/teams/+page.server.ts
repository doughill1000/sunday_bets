import type { PageServerLoad } from './$types';
import { getLeagueSeasons } from '$lib/server/db/queries/league';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  return tracePageLoad('teams', () => loadTeams(event));
};

async function loadTeams(event: Parameters<PageServerLoad>[0]) {
  // Auth is enforced by (app)/+layout.server.ts. League data is league-wide and
  // group-independent, so this load needs no groupId — just the season metadata used to
  // build the query key. The heavy ATS payload is fetched by `+page.ts` (SSR) / the
  // client `createQuery` (revalidation) via `/api/league` (ADR-0017).
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getLeagueSeasons()
  ]);

  // One page-level season dropdown now drives both the by-team roster and the situational
  // cuts (#529), so there is a single resolved `seasonYear` — the `?season=` param, defaulting
  // to the most recent season with data. The old split, where the Trends tab pinned its own
  // `defaultSeasonYear` independent of the Teams picker, is gone: that decoupling was the
  // silent season desync this redesign removes.
  const seasonYear = resolveSeasonYear(
    event.url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  return { currentSeasonYear, seasonYear, availableSeasons };
}

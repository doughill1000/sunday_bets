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

  // One page-level season dropdown now drives both the by-team roster and the situational
  // cuts (#529), so there is a single resolved `seasonYear` — the `?season=` param, defaulting
  // to the most recent season with data. The old split, where the Trends tab pinned its own
  // `defaultSeasonYear` independent of the Teams picker, is gone: that decoupling was the
  // silent season desync this redesign removes.
  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // #638: default the page-level scope to 'pooled' (Last 5) instead of preselecting a season
  // that has already concluded (off-season) — mirrors the "This season" pin fix on
  // /league and /stats. An explicit `?season=` always wins the initial scope regardless.
  const latestSeasonInProgress = await isSeasonInProgress(
    Math.max(seasonYear, ...availableSeasons)
  );
  const defaultScope: 'season' | 'pooled' =
    seasonParam != null || latestSeasonInProgress ? 'season' : 'pooled';

  return { currentSeasonYear, seasonYear, availableSeasons, latestSeasonInProgress, defaultScope };
}

import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import { fetchLeague, fetchLeagueSlate, fetchLeagueTrends } from '$lib/query/fetchers';
import type { LeagueCachePayload, LeagueSlatePayload, LeagueTrendsPayload } from '$lib/query/types';

export const load: PageLoad = async ({ data, fetch }) => {
  // On the server (initial request, reused for hydration), prefetch the cacheable payloads so
  // first paint has data with no flash; handed to the components as `initialData`. On
  // client-side navigation this is skipped — each `createQuery` serves the cache instantly and
  // revalidates in the background (ADR-0017). The slate is keyed on the *current* season (the
  // upcoming week's season), independent of the season the team book shows; the pooled trends
  // payload backs the always-on "Where the market bends" synthesis (#692).
  let initialLeague: LeagueCachePayload | undefined;
  let initialSlate: LeagueSlatePayload | undefined;
  let initialTrends: LeagueTrendsPayload | undefined;
  if (!browser) {
    [initialLeague, initialSlate, initialTrends] = await Promise.all([
      fetchLeague(fetch, data.seasonYear),
      fetchLeagueSlate(fetch, data.currentSeasonYear),
      fetchLeagueTrends(fetch)
    ]);
  }

  return { ...data, initialLeague, initialSlate, initialTrends };
};

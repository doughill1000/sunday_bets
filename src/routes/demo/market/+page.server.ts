// Demo Market (#669): the live season only — matches the frozen live picks week (the issue's
// stated default), group-independent like the real /market. Reads only the committed snapshot
// (#460, ADR-0026). No forward-looking slate (WeekSlate) and no per-team game-log drill-down:
// both are inherently live-query surfaces the frozen snapshot has no data to back.
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    seasonYear: snapshot.meta.liveSeasonYear,
    market: snapshot.market
  };
};

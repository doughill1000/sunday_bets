// Demo Season Wrapped: the persona's "Your Year" + the league Wrapped, from the committed
// snapshot with its frozen AI prose (#460, ADR-0026).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    completedSeasonYear: snapshot.meta.completedSeasonYear,
    player: snapshot.wrapped.player,
    league: snapshot.wrapped.league
  };
};

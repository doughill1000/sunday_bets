// Demo leaderboard: season standings, all-time standings, and league honors/awards — all from
// the committed snapshot (#460, ADR-0026). Consolidates the "leaderboard, awards, badges" payoff
// surfaces onto one page.
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    persona: snapshot.persona,
    completedSeasonYear: snapshot.meta.completedSeasonYear,
    leaderboard: snapshot.leaderboard,
    allTime: snapshot.allTime,
    honors: snapshot.honors
  };
};

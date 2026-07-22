// Demo League: season standings, All-time standings + credibility ladder, league honors/awards,
// and the selected week's hardware — mirrors the real /league IA exactly (#631/#637/#669). All
// from the committed snapshot (#460, ADR-0026).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    groupId: snapshot.meta.groupId,
    persona: snapshot.persona,
    completedSeasonYear: snapshot.meta.completedSeasonYear,
    leaderboard: snapshot.leaderboard,
    allTime: snapshot.allTime,
    honors: snapshot.honors,
    weeklyAwards: snapshot.weeklyAwards
  };
};

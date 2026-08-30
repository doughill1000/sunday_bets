// Demo League: season standings, All-time standings + credibility ladder, and league
// honors/awards — mirrors the real /league IA exactly (#631/#637/#669). The weekly-hardware
// shelf this page also read was cut in #866. All from the committed snapshot (#460, ADR-0026).
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
    honors: snapshot.honors
  };
};

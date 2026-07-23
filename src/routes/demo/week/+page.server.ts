// Demo Week (#776): the demo mirror of the promoted /week destination — the latest graded week's
// hardware from the committed snapshot (#460, ADR-0026). Lifted from the Week tab the demo League
// page carried while the real page kept Week inside /league (#741).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    persona: snapshot.persona,
    completedSeasonYear: snapshot.meta.completedSeasonYear,
    weeklyAwards: snapshot.weeklyAwards
  };
};

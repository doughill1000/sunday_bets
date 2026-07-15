// Demo Season recaps: the frozen weekly Commissioner recaps, hardware, and season shelf for
// the completed season (#460, ADR-0026 — extended #669). Zero LLM calls at serve time — the
// prose was baked at snapshot-generation time.
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    recaps: snapshot.recaps,
    weeklyAwards: snapshot.weeklyAwards,
    currentUserId: snapshot.persona.userId
  };
};

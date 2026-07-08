// Demo AI recaps: the frozen weekly Commissioner recaps for the completed season (#460,
// ADR-0026). Zero LLM calls at serve time — the prose was baked at snapshot-generation time.
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return { recaps: snapshot.recaps };
};

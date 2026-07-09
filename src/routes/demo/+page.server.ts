// Demo landing = the frozen "live" week picks screen (the product's verb). Reads only the
// committed snapshot (#460, ADR-0026).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return { liveWeek: snapshot.liveWeek, personaName: snapshot.persona.displayName };
};

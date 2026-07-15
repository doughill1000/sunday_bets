// Demo Stats (#669): the completed season only — no player picker (the persona is the only
// "you"), no Career toggle (the issue's stated default: aspirational, the season the persona
// won). Reads only the committed snapshot (#460, ADR-0026).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return {
    persona: snapshot.persona,
    seasonYear: snapshot.meta.completedSeasonYear,
    stats: snapshot.stats
  };
};

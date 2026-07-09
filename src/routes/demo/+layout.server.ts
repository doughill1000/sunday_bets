// Public demo route group (#460, ADR-0026). Unauthenticated: the root hook only redirects
// authenticated users without a group, so an anonymous visitor passes straight through. Serves
// the persona + meta from the committed snapshot for the demo chrome — no live DB reads.
import type { LayoutServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';

export const load: LayoutServerLoad = () => {
  const snapshot = getDemoSnapshot();
  return { persona: snapshot.persona, meta: snapshot.meta };
};

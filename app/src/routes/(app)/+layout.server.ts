// src/routes/(app)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { session } = await locals.safeGetSession();
  if (!session) {
    // Preserve where the user was trying to go (optional nice-to-have)
    const next = url.pathname + url.search;
    throw redirect(303, `/auth?next=${encodeURIComponent(next)}`);
  }
  return { session };
};

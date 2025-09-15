import type { LayoutServerLoad } from './$types';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { user, isAdmin } = locals;
  if (!user) {
    throw redirect(303, `/auth?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  if (!isAdmin) {
    throw error(403, 'Forbidden');
  }
  return { user };
};

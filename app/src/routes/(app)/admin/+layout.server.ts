import type { LayoutServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth/guards';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) {
    throw redirect(303, `/auth?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  if (!isAdmin(user)) {
    throw error(403, 'Forbidden');
  }
  return { user };
};
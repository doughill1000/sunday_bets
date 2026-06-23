import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const { session, user } = await locals.safeGetSession();
  return {
    session,
    user,
    isAdmin: locals.isAdmin,
    userProfile: locals.userProfile,
    cookies: cookies.getAll()
  };
};

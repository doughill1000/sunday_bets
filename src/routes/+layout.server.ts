import type { LayoutServerLoad } from './$types';
import { getLatestRecap } from '$lib/server/db/queries/recaps';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const { session, user } = await locals.safeGetSession();

  // Latest AI recap for the flash modal (#284). Only fetched when logged in with a group.
  let latestRecap = null;
  if (user && locals.groupId) {
    try {
      const seasonYear = await getCurrentSeasonYear();
      latestRecap = await getLatestRecap(locals.groupId, seasonYear);
    } catch {
      // Non-fatal: recap flash is best-effort.
    }
  }

  return {
    session,
    user,
    isAdmin: locals.isAdmin,
    userProfile: locals.userProfile,
    groupId: locals.groupId,
    memberships: locals.memberships,
    cookies: cookies.getAll(),
    latestRecap
  };
};

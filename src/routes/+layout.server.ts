import type { LayoutServerLoad } from './$types';
import { getLatestRecap } from '$lib/server/db/queries/recaps';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // The hook (injectSession) already validated the JWT via safeGetSession and set
  // locals.session / locals.user — reading them directly avoids a redundant
  // getUser() network round-trip on every navigation.
  const { session, user } = locals;

  // Stream the recap promise so it never blocks navigation. The layout template
  // resolves it via {#await} and passes the result to RecapFlash.svelte.
  // Always a Promise so the template can unconditionally {#await} it.
  const latestRecap: Promise<Awaited<ReturnType<typeof getLatestRecap>>> =
    user && locals.groupId && locals.currentSeasonYear
      ? locals.currentSeasonYear
          .then((seasonYear) => getLatestRecap(locals.groupId!, seasonYear))
          .catch(() => null)
      : Promise.resolve(null);

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

import type { LayoutServerLoad } from './$types';
import { getLatestRecap } from '$lib/server/db/queries/recaps';
import { hasSeenRecap } from '$lib/server/db/queries/recapSeen';
import { getReigningChampion } from '$lib/server/db/queries/honors';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // The hook (injectSession) already validated the JWT via safeGetSession and set
  // locals.session / locals.user — reading them directly avoids a redundant
  // getUser() network round-trip on every navigation.
  const { session, user } = locals;

  // Stream the recap promise so it never blocks navigation. The layout template
  // resolves it via {#await} and passes the result to RecapFlash.svelte.
  // Always a Promise so the template can unconditionally {#await} it.
  const latestRecap: Promise<Awaited<ReturnType<typeof getLatestRecap>>> =
    user && locals.groupId
      ? locals
          .getCurrentSeasonYear()
          .then((seasonYear) => getLatestRecap(locals.groupId!, seasonYear))
          .catch(() => null)
      : Promise.resolve(null);

  // Cross-device seen-marker for the flash above (#302) — chained off latestRecap
  // so it needs no second groupId/seasonYear lookup. Resolves true (nothing to
  // show) whenever there's no recap, so the flash template can treat "seen" and
  // "nothing to show" the same way.
  const recapSeen: Promise<boolean> = user
    ? latestRecap
        .then((recap) =>
          recap ? hasSeenRecap(user.id, recap.group_id, recap.season_year, recap.week_number) : true
        )
        .catch(() => true)
    : Promise.resolve(true);

  // Streamed so it never blocks navigation. Resolved in the layout template
  // to show a crown on the header avatar when the current user is the reigning champ.
  const championUserId: Promise<string | null> =
    user && locals.groupId
      ? getReigningChampion(locals.groupId)
          .then((c) => c?.user_id ?? null)
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
    latestRecap,
    recapSeen,
    championUserId
  };
};

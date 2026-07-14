import type { LayoutServerLoad } from './$types';
import { getLatestRecap } from '$lib/server/db/queries/recaps';
import { hasSeenRecap } from '$lib/server/db/queries/recapSeen';
import { getReigningChampion } from '$lib/server/db/queries/honors';
import { getWrappedSeasons, getSeasonWrapped } from '$lib/server/db/queries/seasonWrapped';
import { hasSeenWrapped } from '$lib/server/db/queries/wrappedSeen';
import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';

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

  // The most-recent season with a generated Wrapped, whichever row the /wrapped page
  // itself would default to (the viewer's own player row, falling back to the league
  // row). Streamed for WrappedFlash.svelte (#548), mirroring the latestRecap shape
  // above. Always a Promise so the template can unconditionally {#await} it.
  const latestWrapped: Promise<SeasonWrappedRow | null> =
    user && locals.groupId
      ? getWrappedSeasons(locals.groupId)
          .then((seasons) => {
            const seasonYear = seasons[0];
            if (seasonYear == null) return null;
            return getSeasonWrapped(locals.groupId!, seasonYear, user.id).then(
              ({ league, player }) => player ?? league
            );
          })
          .catch(() => null)
      : Promise.resolve(null);

  // Cross-device seen-marker for the Wrapped flash (#548, mirrors recap_seen/#302) —
  // chained off latestWrapped so it needs no second groupId/seasonYear lookup. Keyed
  // by season only (not scope), since it tracks whichever row the flash actually showed.
  const wrappedSeen: Promise<boolean> = user
    ? latestWrapped
        .then((row) => (row ? hasSeenWrapped(user.id, row.group_id, row.season_year) : true))
        .catch(() => true)
    : Promise.resolve(true);

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
    championUserId,
    latestWrapped,
    wrappedSeen
  };
};

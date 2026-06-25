// src/lib/server/group-resolver.ts
/**
 * Shared constants for the active-group resolution flow.
 * Imported by hooks.server.ts (which writes the cookie) and the switch API
 * endpoint (which also writes it), keeping the cookie name in one place.
 */

/** Cookie name that persists the user's active group selection. */
export const ACTIVE_GROUP_COOKIE = 'active_group_id';

/**
 * Resolves which group_id should be active given a cookie value and the set of
 * active membership group IDs. Returns the cookie value if it is valid, or the
 * first fallback entry if it is absent / stale.
 *
 * Exported as a pure function so it can be unit-tested without a live server.
 */
export function resolveActiveGroupId(
  cookieValue: string | null | undefined,
  activeMembershipIds: string[]
): string | null {
  if (!activeMembershipIds.length) return null;

  if (cookieValue && activeMembershipIds.includes(cookieValue)) {
    return cookieValue;
  }

  // Cookie absent or stale: fall back to the first active membership.
  return activeMembershipIds[0];
}

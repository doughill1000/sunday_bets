// Shared guard for the validated-param read routes (ADR-0017 boundary 1).
//
// These `/api/{stats,group,leaderboard}` endpoints take an explicit `?groupId=&season=`
// and validate `groupId` against `locals.memberships` — the same membership check as
// `/api/groups/switch` — before calling the service-role query functions. They are a
// validated-param read path, not a new trust boundary: the query functions remain
// `group_id`-filtered and the cache is never the security boundary.
import { json } from '@sveltejs/kit';

export type GroupScopedReadParams =
  | { ok: true; groupId: string; seasonYear: number }
  | { ok: false; response: Response };

export type GroupOnlyReadParams = { ok: true; groupId: string } | { ok: false; response: Response };

/** Shared 401/400/403 prefix for both guards: authenticate, parse `groupId`, and authorize
 *  it against `locals.memberships`. Returns the validated `groupId` or a ready error `Response`. */
function authorizeGroupRead(
  locals: App.Locals,
  url: URL
): { groupId: string } | { response: Response } {
  if (!locals.user) {
    return { response: json({ error: 'unauthenticated' }, { status: 401 }) };
  }

  const groupId = url.searchParams.get('groupId');
  if (!groupId) {
    return { response: json({ error: 'groupId is required' }, { status: 400 }) };
  }

  const isMember = locals.memberships.some((m) => m.groupId === groupId);
  if (!isMember) {
    return { response: json({ error: 'not a member of that group' }, { status: 403 }) };
  }

  return { groupId };
}

/**
 * Authenticate, parse, and authorize a group-scoped read request. Returns either the
 * validated `{ groupId, seasonYear }` or a ready-to-return error `Response`:
 * - 401 when there is no authenticated user
 * - 400 when `groupId` or a valid integer `season` is missing
 * - 403 when the user is not an active member of the requested group
 */
export function guardGroupScopedRead(locals: App.Locals, url: URL): GroupScopedReadParams {
  const authorized = authorizeGroupRead(locals, url);
  if ('response' in authorized) return { ok: false, response: authorized.response };

  const seasonRaw = url.searchParams.get('season');
  const seasonYear = seasonRaw != null ? Number(seasonRaw) : NaN;
  if (!Number.isInteger(seasonYear)) {
    return { ok: false, response: json({ error: 'season is required' }, { status: 400 }) };
  }

  return { ok: true, groupId: authorized.groupId, seasonYear };
}

/**
 * Same as {@link guardGroupScopedRead} but for season-independent reads (e.g. the All-time
 * leaderboard, #376) — no `season` param is required or parsed.
 * - 401 when there is no authenticated user
 * - 400 when `groupId` is missing
 * - 403 when the user is not an active member of the requested group
 */
export function guardGroupRead(locals: App.Locals, url: URL): GroupOnlyReadParams {
  const authorized = authorizeGroupRead(locals, url);
  if ('response' in authorized) return { ok: false, response: authorized.response };

  return { ok: true, groupId: authorized.groupId };
}

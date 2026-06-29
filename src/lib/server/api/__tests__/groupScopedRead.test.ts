import { describe, it, expect } from 'vitest';
import { guardGroupScopedRead } from '$lib/server/api/groupScopedRead';

// The guard is the trust boundary for the `/api/{stats,group,leaderboard}` read routes
// (ADR-0017 boundary 1): authenticate, parse `?groupId=&season=`, and authorize the group
// against `locals.memberships` before any query runs. These tests exercise that logic in
// isolation — the same 401 / 400 / 403 contract every read route relies on.

const MEMBER_GROUP = '00000000-0000-4000-8000-00000000a001';
const OTHER_GROUP = '00000000-0000-4000-8000-00000000b002';

function makeLocals(over: Partial<App.Locals> = {}): App.Locals {
  return {
    user: { id: 'user-1' },
    memberships: [{ groupId: MEMBER_GROUP, groupName: 'Mine', role: 'member' }],
    ...over
  } as unknown as App.Locals;
}

function urlFor(params: Record<string, string>): URL {
  const u = new URL('http://localhost/api/stats');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u;
}

describe('guardGroupScopedRead', () => {
  it('returns 401 when there is no authenticated user', () => {
    const guard = guardGroupScopedRead(
      makeLocals({ user: null }),
      urlFor({ groupId: MEMBER_GROUP, season: '2024' })
    );
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it('returns 400 when groupId is missing', () => {
    const guard = guardGroupScopedRead(makeLocals(), urlFor({ season: '2024' }));
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(400);
  });

  it('returns 403 when the user is not a member of the requested group', () => {
    const guard = guardGroupScopedRead(
      makeLocals(),
      urlFor({ groupId: OTHER_GROUP, season: '2024' })
    );
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it('returns 400 when season is missing', () => {
    const guard = guardGroupScopedRead(makeLocals(), urlFor({ groupId: MEMBER_GROUP }));
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(400);
  });

  it('returns 400 when season is not an integer', () => {
    const guard = guardGroupScopedRead(
      makeLocals(),
      urlFor({ groupId: MEMBER_GROUP, season: 'soon' })
    );
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(400);
  });

  it('authorizes a member and returns the parsed groupId + seasonYear', () => {
    const guard = guardGroupScopedRead(
      makeLocals(),
      urlFor({ groupId: MEMBER_GROUP, season: '2024' })
    );
    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.groupId).toBe(MEMBER_GROUP);
      expect(guard.seasonYear).toBe(2024);
    }
  });
});

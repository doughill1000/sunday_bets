// tests/integration/adminAuthz.test.ts
//
// Lock in the admin authorization boundary for every /api/admin/* route.
// Tests that each route returns 403 for a non-admin authenticated user and
// succeeds (not 403) for an admin. Route handlers are imported and called
// directly with minimal RequestEvent mocks — the same pattern used by
// games.test.ts — so no running SvelteKit server is needed.
//
// Additionally verifies that add-member writes to the REQUESTED group, not
// the hardcoded fallback group.

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';

// Importing the admin route handlers transitively pulls in modules that
// `import * as Sentry from '@sentry/sveltekit'` (e.g. scheduleSync). The real
// package eagerly loads its client bundle, which imports the `$app` runtime
// alias that does not exist in the node/jsdom test environment. Stub it — the
// only member used in the server chain is captureException. Mirrors push.spec.ts.
vi.mock('@sentry/sveltekit', () => ({ captureException: () => undefined }));

import { createServiceClient } from './_auth';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureTeams,
  ensureSeasonAndWeek,
  ensureSettings,
  ensureGroup,
  TWO_GROUP_IDS
} from './fixtures/db';

// ---------------------------------------------------------------------------
// Route handler imports
// Each file lives under src/routes/(app)/api/admin/<name>/+server.ts.
// ---------------------------------------------------------------------------
import { POST as gradeGameHandler } from '../../src/routes/(app)/api/admin/grade-game/+server';
import { POST as gradeWeekHandler } from '../../src/routes/(app)/api/admin/grade-week/+server';
import { POST as gradeSeasonHandler } from '../../src/routes/(app)/api/admin/grade-season/+server';
import { GET as weekGamesHandler } from '../../src/routes/(app)/api/admin/week-games/+server';
import { POST as syncOddsHandler } from '../../src/routes/(app)/api/admin/sync-odds/+server';
import { POST as syncScheduleHandler } from '../../src/routes/(app)/api/admin/sync-schedule/+server';
import { POST as addMemberHandler } from '../../src/routes/(app)/api/admin/add-member/+server';
import { PATCH as settingsPatchHandler } from '../../src/routes/(app)/api/admin/settings/+server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const supabase = createServiceClient();

// Stable IDs to keep the test deterministic and easy to clean up.
const ADMIN_USER_ID = TEST_USERS[0].id; // elevated to admin by ensureCoreTestUsers
const NON_ADMIN_USER_ID = TEST_USERS[1].id; // plain player

/**
 * Build a minimal RequestEvent mock with the given admin flag.
 * requireAdmin() only needs `event.locals.user` and `event.locals.isAdmin`.
 * The body factory is used to produce the JSON body for the request.
 *
 * Typed as `unknown` so it can be cast at each call site — SvelteKit emits
 * route-specific RequestEvent subtypes that differ only in their `routeId`
 * discriminant, so we cast through unknown rather than maintaining a parallel
 * interface hierarchy.
 */
function makeEvent(userId: string, isAdmin: boolean, body: Record<string, unknown> = {}): unknown {
  return {
    locals: {
      user: { id: userId },
      isAdmin
    },
    request: {
      json: async () => body
    }
  };
}

/** Convenience: invoke a SvelteKit route handler with a mock event. */
async function invoke(
  handler: (e: any) => unknown,
  userId: string,
  isAdmin: boolean,
  body: Record<string, unknown> = {}
): Promise<Response> {
  return Promise.resolve(handler(makeEvent(userId, isAdmin, body))) as Promise<Response>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// IDs seeded during setup for use in positive-path calls.
let seededWeekId: number;
let seededSeasonId: number;

beforeAll(async () => {
  await ensureCoreTestUsers(supabase, true); // TEST_USERS[0] -> admin
  await ensureTeams(supabase);
  // admin authz tests own season 2097, week 5 (distinct from all other suites)
  const ids = await ensureSeasonAndWeek(supabase, 2097, 5);
  seededWeekId = ids.weekId;
  seededSeasonId = ids.seasonId;
  await ensureSettings(supabase);
  // Ensure group B exists for the add-member group routing test
  await ensureGroup(supabase, { id: TWO_GROUP_IDS.groupB, name: 'Authz Test Group B' });
});

afterAll(async () => {
  // Clean up any users that add-member may have created in the DB.
  // We use a deterministic email prefix so we can target them.
  const testEmail = 'authz-addmember-test@example.com';
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const toDelete = (authUsers?.users ?? []).filter((u) => u.email === testEmail);
  for (const u of toDelete) {
    await supabase.auth.admin.deleteUser(u.id);
  }
});

// ---------------------------------------------------------------------------
// requireAdmin fresh re-check (ADR-0014 boundary 2)
//
// `requireAdmin` must verify `users.role` FRESH/UNCACHED rather than trust the
// cached `locals.isAdmin`. These tests force `locals.isAdmin` to disagree with
// the DB and assert the DB wins both directions — so deny-after-revocation is
// immediate (a demoted admin with `isAdmin` cached stale-true is still denied)
// and a freshly-promoted admin is not locked out by a stale-false cache.
// ---------------------------------------------------------------------------

describe('requireAdmin re-reads users.role fresh (ignores stale locals.isAdmin)', () => {
  test('rejects a non-admin whose isAdmin is cached stale-true (deny after revocation)', async () => {
    // NON_ADMIN_USER_ID is a plain player in the DB; pass isAdmin: true to
    // simulate a stale cache entry from before demotion. Must still 403.
    const res = await invoke(settingsPatchHandler, NON_ADMIN_USER_ID, true, {
      final_week_unlimited_allin: false
    });
    expect(res.status).toBe(403);
  });

  test('admits an admin whose isAdmin is cached stale-false', async () => {
    // ADMIN_USER_ID is an admin in the DB; pass isAdmin: false to simulate a
    // stale cache from before promotion. The fresh read must let it through.
    const res = await invoke(settingsPatchHandler, ADMIN_USER_ID, false, {
      final_week_unlimited_allin: false
    });
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// grade-game — POST
// ---------------------------------------------------------------------------

describe('POST /api/admin/grade-game', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(gradeGameHandler, NON_ADMIN_USER_ID, false, {
      game_id: '00000000-0000-0000-0000-000000000999'
    });
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin (may 400/500 due to missing game — that is ok)', async () => {
    const res = await invoke(gradeGameHandler, ADMIN_USER_ID, true, {
      game_id: '00000000-0000-0000-0000-000000000999'
    });
    expect(res.status).not.toBe(403);
  });

  test('returns 400 when game_id is missing (admin path)', async () => {
    const res = await invoke(gradeGameHandler, ADMIN_USER_ID, true, {});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// grade-week — POST
// ---------------------------------------------------------------------------

describe('POST /api/admin/grade-week', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(gradeWeekHandler, NON_ADMIN_USER_ID, false, {
      week_id: seededWeekId
    });
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin', async () => {
    const res = await invoke(gradeWeekHandler, ADMIN_USER_ID, true, {
      week_id: seededWeekId
    });
    expect(res.status).not.toBe(403);
  });

  test('returns 400 when week_id is missing (admin path)', async () => {
    const res = await invoke(gradeWeekHandler, ADMIN_USER_ID, true, {});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// grade-season — POST
// ---------------------------------------------------------------------------

describe('POST /api/admin/grade-season', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(gradeSeasonHandler, NON_ADMIN_USER_ID, false, {
      season_id: seededSeasonId
    });
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin', async () => {
    const res = await invoke(gradeSeasonHandler, ADMIN_USER_ID, true, {
      season_id: seededSeasonId
    });
    expect(res.status).not.toBe(403);
  });

  test('returns 400 when season_id is missing (admin path)', async () => {
    const res = await invoke(gradeSeasonHandler, ADMIN_USER_ID, true, {});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// week-games — GET (read-only picker source; still admin-gated)
// ---------------------------------------------------------------------------

describe('GET /api/admin/week-games', () => {
  // This handler reads event.url (not a JSON body), so build a GET-shaped event.
  function makeGetEvent(userId: string, isAdmin: boolean, weekId: number | string): unknown {
    return {
      locals: { user: { id: userId }, isAdmin },
      url: new URL(`http://localhost/api/admin/week-games?week_id=${weekId}`)
    };
  }

  test('returns 403 for non-admin', async () => {
    const res = (await Promise.resolve(
      weekGamesHandler(makeGetEvent(NON_ADMIN_USER_ID, false, seededWeekId) as any)
    )) as Response;
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin', async () => {
    const res = (await Promise.resolve(
      weekGamesHandler(makeGetEvent(ADMIN_USER_ID, true, seededWeekId) as any)
    )) as Response;
    expect(res.status).not.toBe(403);
  });

  test('returns 400 for an invalid week_id (admin path)', async () => {
    const res = (await Promise.resolve(
      weekGamesHandler(makeGetEvent(ADMIN_USER_ID, true, 'not-a-number') as any)
    )) as Response;
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// sync-odds — POST
// ---------------------------------------------------------------------------

describe('POST /api/admin/sync-odds', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(syncOddsHandler, NON_ADMIN_USER_ID, false);
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin (may 400/500 due to missing API key — that is ok)', async () => {
    const res = await invoke(syncOddsHandler, ADMIN_USER_ID, true);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// sync-schedule — POST
// ---------------------------------------------------------------------------

describe('POST /api/admin/sync-schedule', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(syncScheduleHandler, NON_ADMIN_USER_ID, false);
    expect(res.status).toBe(403);
  });

  test('does not return 403 for admin (may 400/500 due to missing API key — that is ok)', async () => {
    const res = await invoke(syncScheduleHandler, ADMIN_USER_ID, true);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// settings — PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/settings', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(settingsPatchHandler, NON_ADMIN_USER_ID, false, {
      final_week_unlimited_allin: false
    });
    expect(res.status).toBe(403);
  });

  test('returns 200 for admin with valid payload', async () => {
    const res = await invoke(settingsPatchHandler, ADMIN_USER_ID, true, {
      final_week_unlimited_allin: false
    });
    expect(res.status).toBe(200);
  });

  test('returns 400 for admin with invalid payload', async () => {
    const res = await invoke(settingsPatchHandler, ADMIN_USER_ID, true, {
      final_week_unlimited_allin: 'not-a-boolean'
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// add-member — POST + group routing assertion
// ---------------------------------------------------------------------------

describe('POST /api/admin/add-member', () => {
  test('returns 403 for non-admin', async () => {
    const res = await invoke(addMemberHandler, NON_ADMIN_USER_ID, false, {
      email: 'authz-nonAdmin-reject@example.com',
      displayName: 'Should Not Be Created'
    });
    expect(res.status).toBe(403);
  });

  test('returns 400 when email is missing (admin path)', async () => {
    const res = await invoke(addMemberHandler, ADMIN_USER_ID, true, {
      displayName: 'No Email'
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when displayName is missing (admin path)', async () => {
    const res = await invoke(addMemberHandler, ADMIN_USER_ID, true, {
      email: 'authz-addmember-nodisplay@example.com'
    });
    expect(res.status).toBe(400);
  });

  test('add-member writes membership to the REQUESTED groupId, not the hardcoded original', async () => {
    // Use a deterministic email so afterAll can clean it up.
    const testEmail = 'authz-addmember-test@example.com';
    const targetGroupId = TWO_GROUP_IDS.groupB;

    // Pre-condition: ensure no leftover auth user from a prior run.
    const { data: prior } = await supabase.auth.admin.listUsers();
    const existing = (prior?.users ?? []).find((u) => u.email === testEmail);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const res = await invoke(addMemberHandler, ADMIN_USER_ID, true, {
      email: testEmail,
      displayName: 'Authz Add Member Test',
      groupId: targetGroupId
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.userId).toBe('string');

    // Verify the membership landed in the REQUESTED group, not the fallback.
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', body.userId);
    expect(error).toBeNull();
    const groupIds = (memberships ?? []).map((m) => m.group_id);
    expect(groupIds).toContain(targetGroupId);
  });
});

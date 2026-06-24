// tests/integration/selfSignup.test.ts
//
// WS2 of #188 — self-sign-up lifecycle integration tests.
//
// Verifies the provisioning contract established by the `handle_new_auth_user`
// trigger (supabase/src/functions/auth/handle_new_auth_user.sql):
//   - After an auth.users INSERT the trigger writes a public.users row with
//     role='player' and a display_name derived from email local-part.
//   - No group_memberships are created automatically.
//
// Also contains the multi-group determinism guard for issue #150.
// See "Multi-group determinism guard" section below.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createSupaClient } from './_helpers';
import {
  SELF_SIGNUP_USER,
  newSelfSignupUser,
  deleteAuthUsers,
  seedTwoGroupSettlements,
  TWO_GROUP_IDS
} from './fixtures/db';

const supabase = createSupaClient();

// ---------------------------------------------------------------------------
// Provisioning contract
// ---------------------------------------------------------------------------

describe('self-signup provisioning contract', () => {
  beforeAll(async () => {
    // Clean up any leftover row from a previous run so the trigger fires fresh.
    await deleteAuthUsers([SELF_SIGNUP_USER.id]);
  });

  afterAll(async () => {
    // Remove the seeded user so reruns are clean.
    await deleteAuthUsers([SELF_SIGNUP_USER.id]);
  });

  it('creates a public.users row with role=player after auth.users INSERT', async () => {
    // newSelfSignupUser inserts the auth.users row (which fires the trigger)
    // and explicitly upserts public.users for idempotency.
    const { id } = await newSelfSignupUser(supabase);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, display_name')
      .eq('id', id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(user).not.toBeNull();
    expect(user!.id).toBe(SELF_SIGNUP_USER.id);
    expect(user!.role).toBe('player');
  });

  it('sets display_name to the email local-part (trigger behaviour)', async () => {
    // The trigger uses split_part(new.email, '@', 1) when raw_user_meta_data
    // contains no display_name or full_name. ensureAuthUsers passes no metadata,
    // so the display_name must equal the local-part of the email.
    const expectedDisplayName = SELF_SIGNUP_USER.email.split('@')[0]; // 'self-signup'

    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', SELF_SIGNUP_USER.id)
      .maybeSingle();

    expect(user?.display_name).toBe(expectedDisplayName);
  });

  it('creates zero group_memberships for the new user (orphan state)', async () => {
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', SELF_SIGNUP_USER.id);

    expect(error).toBeNull();
    expect(memberships).toHaveLength(0);
  });

  it('is idempotent: re-running newSelfSignupUser does not throw', async () => {
    // The second call hits the ON CONFLICT (id) DO NOTHING paths in both
    // auth.users and public.users; membership count must still be zero.
    const { id } = await newSelfSignupUser(supabase);
    expect(id).toBe(SELF_SIGNUP_USER.id);

    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', SELF_SIGNUP_USER.id);

    expect(memberships).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multi-group determinism guard  (#150)
//
// hooks.server.ts (lines 96-100) resolves the active group with:
//
//   supabaseService
//     .from('group_memberships')
//     .select('group_id, status')
//     .eq('user_id', user.id)
//     .limit(1)
//     .maybeSingle()
//
// There is no ORDER BY, so for a user who belongs to more than one group the
// resolved group is arbitrary (Postgres heap-scan order).  Issue #150 will add
// deterministic ordering; this test suite pins the invariants that MUST hold
// both today AND after #150 ships, so the fix cannot introduce a regression:
//
//   Invariant A — The resolved group_id is always a group the user is
//                 actually a member of (never a foreign group_id).
//   Invariant B — Within an unchanged data snapshot the resolved group_id is
//                 stable (repeated resolution returns the same row).
//
// We simulate the hooks.server.ts query here (integration test) rather than
// wiring up a full server request, because the key logic lives in the DB query
// not in rendering.  Placement in this file is intentional: the fixture
// `seedTwoGroupSettlements` (imported above) provides a user who belongs to
// both TWO_GROUP_IDS.groupA and TWO_GROUP_IDS.groupB.
// ---------------------------------------------------------------------------

describe('multi-group determinism guard (#150)', () => {
  // sharedUserId is a member of BOTH groupA and groupB.
  let sharedUserId: string;

  beforeAll(async () => {
    const result = await seedTwoGroupSettlements(supabase);
    sharedUserId = result.sharedUserId;
  });

  it('Invariant A: resolved group_id belongs to a group the user is actually a member of', async () => {
    // Mirror the hooks.server.ts query (no ORDER BY — arbitrary resolution).
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .select('group_id, status')
      .eq('user_id', sharedUserId)
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(membership).not.toBeNull();

    // The resolved group_id must be one the user legitimately belongs to.
    const validGroupIds: string[] = [TWO_GROUP_IDS.groupA, TWO_GROUP_IDS.groupB];
    expect(validGroupIds).toContain(membership!.group_id);
  });

  it('Invariant B: repeated resolution returns the same group_id (stable within unchanged data)', async () => {
    // Run the hooks.server.ts query twice in quick succession.  Without an
    // ORDER BY the result is heap-scan-dependent, but for an unchanged table
    // within the same transaction epoch the scan order must not flip between
    // two consecutive identical queries.  This guards against #150's fix
    // accidentally introducing non-determinism on subsequent calls.
    const query = () =>
      supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', sharedUserId)
        .limit(1)
        .maybeSingle();

    const [first, second] = await Promise.all([query(), query()]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data?.group_id).toBe(second.data?.group_id);
  });

  it('resolved membership has status=active (not pending)', async () => {
    // Both memberships seeded by seedTwoGroupSettlements use the default
    // status='active'.  Whichever group is resolved, its status must be active
    // so hooks.server.ts sets groupId correctly (line 126).
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .select('group_id, status')
      .eq('user_id', sharedUserId)
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(membership?.status).toBe('active');
  });
});

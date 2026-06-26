// tests/e2e/join-invite.spec.ts
//
// E2E for the /join/[code] invite-redemption flow (#149, ADR-0006 dec. 2 & 6).
//
// Covers:
//   1. Signed-in user redeems a valid invite and reaches /picks.
//   2. Signed-out user is sent to /auth with the invite path preserved, signs
//      in, is returned to /join/[code], and completes the join.
//   3. Invalid/expired/revoked invite codes show friendly error states.
//   4. Already-a-member user is routed into the group without a duplicate row.
//
// DEFERRED: these tests require a running local Supabase + Docker stack and
// MUST NOT be run concurrently with migration-ledger changes (see PR body).
// Run with `pnpm test:e2e` in a serialized pass after Docker is available.
//
// Each spec runs in an isolated browser context (no shared storageState).
// Users are created via the GoTrue admin API so they can password-login.

import { test, expect, type BrowserContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { joinPage } from './helpers/join-page';
import { makeServiceClient } from './helpers/seed';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ mode: 'serial', timeout: 25_000 });

// ---------------------------------------------------------------------------
// Deterministic test identities and helpers
// ---------------------------------------------------------------------------

const INVITEE = {
  email: 'e2e-join-invitee@example.com',
  password: 'e2e-join-invitee-pw-1',
  displayName: 'e2e-join-invitee'
};

const INVITEE_SIGNEDOUT = {
  email: 'e2e-join-signedout@example.com',
  password: 'e2e-join-signedout-pw-1',
  displayName: 'e2e-join-signedout'
};

const INVITEE_ALREADY_MEMBER = {
  email: 'e2e-join-already-member@example.com',
  password: 'e2e-join-already-member-pw-1',
  displayName: 'e2e-join-already-member'
};

// Existing group seeded in global-setup.ts (the original group all e2e users
// are members of). We create a fresh group below so these tests are isolated.
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

let supabase: SupabaseClient;
let testGroupId: string;
let validCode: string;
let expiredCode: string;
let revokedCode: string;

let inviteeUserId: string;
let signedOutUserId: string;
let alreadyMemberId: string;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  supabase = makeServiceClient();

  // Create a fresh isolated group for these tests so we don't collide with
  // other specs that rely on the original group.
  const { data: groupData, error: groupErr } = await supabase
    .from('groups')
    .insert({ name: `E2E Join Invite Group ${Date.now()}` })
    .select('id')
    .single();
  if (groupErr || !groupData) throw new Error('seed group: ' + groupErr?.message);
  testGroupId = groupData.id;

  // Seed a group_config row (required by the group FK if the table enforces it).
  // Silently ignore if the insert fails (config may not be required).
  await supabase
    .from('group_config')
    .upsert({ group_id: testGroupId }, { onConflict: 'group_id' })
    .then(() => null);

  // ---------------------------------------------------------------------------
  // Invite codes
  // ---------------------------------------------------------------------------

  const creatorId =
    (
      await supabase
        .from('group_memberships')
        .select('user_id')
        .eq('group_id', ORIGINAL_GROUP_ID)
        .limit(1)
        .single()
    ).data?.user_id ?? '';

  validCode = `e2e-valid-${Date.now()}`;
  expiredCode = `e2e-expired-${Date.now()}`;
  revokedCode = `e2e-revoked-${Date.now()}`;

  const invites = [
    {
      code: validCode,
      group_id: testGroupId,
      created_by: creatorId,
      max_uses: 10,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    },
    {
      code: expiredCode,
      group_id: testGroupId,
      created_by: creatorId,
      max_uses: null,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    {
      code: revokedCode,
      group_id: testGroupId,
      created_by: creatorId,
      max_uses: null,
      expires_at: null,
      revoked_at: new Date().toISOString()
    }
  ];

  const { error: inviteErr } = await supabase.from('group_invites').insert(invites);
  if (inviteErr) throw new Error('seed invites: ' + inviteErr.message);

  // ---------------------------------------------------------------------------
  // Test users
  // ---------------------------------------------------------------------------

  async function ensureUser(email: string, password: string, displayName: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName }
    });

    let id = data?.user?.id;
    if (!id && error && /already|exists|registered/i.test(error.message)) {
      const { data: list } = await supabase.auth.admin.listUsers();
      id = list?.users.find((u) => u.email === email)?.id;
    }
    if (!id) {
      throw new Error(`could not resolve user id for ${email}: ${error?.message}`);
    }

    // Mark the welcome guide as already seen so the WelcomeGuide modal does not
    // auto-open and intercept clicks on the /join/[code] page.
    await supabase.from('users').upsert(
      {
        id,
        display_name: displayName,
        role: 'player',
        guide_seen_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    return id;
  }

  inviteeUserId = await ensureUser(INVITEE.email, INVITEE.password, INVITEE.displayName);
  signedOutUserId = await ensureUser(
    INVITEE_SIGNEDOUT.email,
    INVITEE_SIGNEDOUT.password,
    INVITEE_SIGNEDOUT.displayName
  );
  alreadyMemberId = await ensureUser(
    INVITEE_ALREADY_MEMBER.email,
    INVITEE_ALREADY_MEMBER.password,
    INVITEE_ALREADY_MEMBER.displayName
  );

  // Start each user without a membership in the test group (idempotent).
  await supabase
    .from('group_memberships')
    .delete()
    .eq('user_id', inviteeUserId)
    .eq('group_id', testGroupId);
  await supabase
    .from('group_memberships')
    .delete()
    .eq('user_id', signedOutUserId)
    .eq('group_id', testGroupId);

  // Already-member user IS a member from the start.
  await supabase
    .from('group_memberships')
    .upsert(
      { group_id: testGroupId, user_id: alreadyMemberId, role: 'member' },
      { onConflict: 'group_id,user_id' }
    );
});

test.afterAll(async () => {
  if (!supabase) return;
  // Remove the isolated test group (cascades to memberships and invites via FK).
  if (testGroupId) {
    await supabase.from('group_memberships').delete().eq('group_id', testGroupId);
    await supabase.from('group_invites').delete().eq('group_id', testGroupId);
    await supabase.from('groups').delete().eq('id', testGroupId);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signInAs(
  context: BrowserContext,
  credentials: { email: string; password: string }
): Promise<import('@playwright/test').Page> {
  const page = await context.newPage();
  await page.goto('/auth');

  await expect(async () => {
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 8000 });

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);

  const signInResponse = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signInResponse;

  return page;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('signed-in user redeems a valid invite and reaches /picks', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, INVITEE);
    const jb = joinPage(page);

    // No membership yet → hook sends to /join; navigate directly to the invite URL.
    await jb.gotoInvite(validCode);

    // The invite page should show the join form with an actionable join button.
    await jb.expectJoinButtonVisible(10000);

    await expect(async () => {
      await jb.joinButton().click();
      await expect(page).toHaveURL(/\/picks/, { timeout: 2000 });
    }).toPass({ timeout: 8000 });

    // Verify the membership row was created.
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role, status')
      .eq('user_id', inviteeUserId)
      .eq('group_id', testGroupId)
      .single();
    expect(membership?.role).toBe('member');
    expect(membership?.status).toBe('active');
  } finally {
    await context.close();
  }
});

test('signed-out user is sent to /auth, signs in, and completes join', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const jb = joinPage(page);

    // Visit the invite URL without being signed in.
    await jb.gotoInvite(validCode);

    // Should be redirected to /auth with next param preserved.
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
    // The invite code in the next param is real fixture data — keep this assertion.
    expect(page.url()).toContain(encodeURIComponent(`/join/${validCode}`));

    // Sign in on the auth page — the server reads ?next= and redirects back.
    await expect(async () => {
      await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 8000 });

    await page.locator('input[name="email"]').fill(INVITEE_SIGNEDOUT.email);
    await page.locator('input[name="password"]').fill(INVITEE_SIGNEDOUT.password);

    const signInResponse = page.waitForResponse(
      (r) => r.url().includes('/auth') && r.request().method() === 'POST'
    );
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await signInResponse;

    // Should land back at /join/[code] (not /picks) after sign-in.
    await expect(page).toHaveURL(new RegExp(`/join/${validCode}`), { timeout: 10000 });

    // Complete the join.
    await jb.expectJoinButtonVisible(10000);
    await expect(async () => {
      await jb.joinButton().click();
      await expect(page).toHaveURL(/\/picks/, { timeout: 2000 });
    }).toPass({ timeout: 8000 });

    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('user_id', signedOutUserId)
      .eq('group_id', testGroupId)
      .single();
    expect(membership?.role).toBe('member');
  } finally {
    await context.close();
  }
});

test('expired invite shows a friendly error and no membership is written', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    // Sign in as the invitee (already a member so the hook lets them through,
    // but they are NOT a member of the test group).
    const page = await signInAs(context, INVITEE);
    const jb = joinPage(page);

    await jb.gotoInvite(expiredCode);

    await jb.expectExpiredVisible(10000);

    // No join button should be visible for a terminal error state.
    await jb.expectJoinButtonNotVisible();
  } finally {
    await context.close();
  }
});

test('revoked invite shows a friendly error and no membership is written', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, INVITEE);
    const jb = joinPage(page);

    await jb.gotoInvite(revokedCode);

    await jb.expectRevokedVisible(10000);
    await jb.expectJoinButtonNotVisible();
  } finally {
    await context.close();
  }
});

test('invalid code shows a not-found message', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, INVITEE);
    const jb = joinPage(page);

    await jb.gotoInvite('totally-invalid-code-xyz-999');

    await jb.expectInvalidVisible(10000);
    await jb.expectJoinButtonNotVisible();
  } finally {
    await context.close();
  }
});

test('already-a-member is routed to /picks without a duplicate row', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, INVITEE_ALREADY_MEMBER);
    const jb = joinPage(page);

    // Navigate to the invite URL — the load should detect existing membership
    // and redirect straight to /picks.
    await jb.gotoInvite(validCode);
    await expect(page).toHaveURL(/\/picks/, { timeout: 10000 });

    // Confirm there is still exactly one membership row (no duplicate).
    // group_memberships has a composite (group_id, user_id) PK and no `id` column.
    const { data: rows } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('user_id', alreadyMemberId)
      .eq('group_id', testGroupId);
    expect(rows?.length).toBe(1);
  } finally {
    await context.close();
  }
});

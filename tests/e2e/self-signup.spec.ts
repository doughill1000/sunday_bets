// tests/e2e/self-signup.spec.ts
//
// WS2 of #188 — routing tests for the three membership states.
//
// hooks.server.ts (src/hooks.server.ts, lines 96-126) resolves each
// authenticated request's membership state:
//
//   - No group_memberships row  → redirect(303, '/join')
//   - membership.status === 'pending' → redirect(303, '/join/pending')
//   - membership.status === 'active'  → request proceeds (no redirect)
//
// The exempt paths (/auth, /api, /join) are not subject to this logic.
//
// Each test creates its own isolated browser context (no shared storageState)
// so sessions never leak between cases.
//
// Seeded users are created via supabase.auth.admin.createUser with
// email_confirm:true so they can password-login (seed.sql rows lack
// auth.identities and cannot use the password flow).

import { test, expect, type BrowserContext } from '@playwright/test';
import { joinPage } from './helpers/join-page';
import { makeServiceClient } from './helpers/seed';

// ---------------------------------------------------------------------------
// Stable test-user definitions (distinct from the main E2E user so
// these tests can run without touching the shared auth.setup.ts session).
// ---------------------------------------------------------------------------

const SELF_SIGNUP_NO_MEMBER = {
  email: 'e2e-self-signup-no-member@example.com',
  password: 'e2e-self-signup-no-member-pw-1',
  displayName: 'e2e-no-member'
};

const SELF_SIGNUP_PENDING = {
  email: 'e2e-self-signup-pending@example.com',
  password: 'e2e-self-signup-pending-pw-1',
  displayName: 'e2e-pending'
};

const SELF_SIGNUP_ACTIVE = {
  email: 'e2e-self-signup-active@example.com',
  password: 'e2e-self-signup-active-pw-1',
  displayName: 'e2e-active'
};

// Group used for the pending/active membership users.
const E2E_SELF_SIGNUP_GROUP_ID = '00000000-0000-4000-8000-000000009e2e';

// Each test runs in a fresh browser context (no persisted auth cookies).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ timeout: 25_000 });

// ---------------------------------------------------------------------------
// Shared setup: ensure users and membership state exist before any test runs.
// ---------------------------------------------------------------------------

let noMemberUserId: string;
let pendingUserId: string;
let activeUserId: string;

test.beforeAll(async () => {
  const supabase = makeServiceClient();

  // Ensure the group exists.
  await supabase
    .from('groups')
    .upsert({ id: E2E_SELF_SIGNUP_GROUP_ID, name: 'E2E Self-Signup Group' }, { onConflict: 'id' });

  // Create/resolve all three test users via the admin API so they can
  // password-login (supabase.auth.admin.createUser creates auth.identities).
  async function ensureUser(opts: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { display_name: opts.displayName }
    });
    if (data?.user?.id) return data.user.id;
    if (error && /already|exists|registered/i.test(error.message)) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === opts.email);
      if (existing) return existing.id;
    }
    throw new Error(`ensureUser(${opts.email}) failed: ${error?.message ?? 'unknown'}`);
  }

  noMemberUserId = await ensureUser(SELF_SIGNUP_NO_MEMBER);
  pendingUserId = await ensureUser(SELF_SIGNUP_PENDING);
  activeUserId = await ensureUser(SELF_SIGNUP_ACTIVE);

  // Ensure public.users rows (the handle_new_auth_user trigger may have fired,
  // but upsert here guarantees the rows exist for subsequent FK operations).
  await supabase.from('users').upsert(
    [
      { id: noMemberUserId, display_name: SELF_SIGNUP_NO_MEMBER.displayName, role: 'player' },
      { id: pendingUserId, display_name: SELF_SIGNUP_PENDING.displayName, role: 'player' },
      { id: activeUserId, display_name: SELF_SIGNUP_ACTIVE.displayName, role: 'player' }
    ],
    { onConflict: 'id' }
  );

  // Ensure no stale memberships for the no-member user.
  await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', E2E_SELF_SIGNUP_GROUP_ID)
    .eq('user_id', noMemberUserId);

  // Pending membership.
  await supabase.from('group_memberships').upsert(
    {
      group_id: E2E_SELF_SIGNUP_GROUP_ID,
      user_id: pendingUserId,
      role: 'member',
      status: 'pending'
    },
    { onConflict: 'group_id,user_id' }
  );
  // Update in case the row already existed with a different status.
  await supabase
    .from('group_memberships')
    .update({ status: 'pending' })
    .eq('group_id', E2E_SELF_SIGNUP_GROUP_ID)
    .eq('user_id', pendingUserId);

  // Active membership.
  await supabase.from('group_memberships').upsert(
    {
      group_id: E2E_SELF_SIGNUP_GROUP_ID,
      user_id: activeUserId,
      role: 'member',
      status: 'active'
    },
    { onConflict: 'group_id,user_id' }
  );
  await supabase
    .from('group_memberships')
    .update({ status: 'active' })
    .eq('group_id', E2E_SELF_SIGNUP_GROUP_ID)
    .eq('user_id', activeUserId);
});

// ---------------------------------------------------------------------------
// Helper: sign in as a specific user in an isolated context and return a page.
// ---------------------------------------------------------------------------

async function signInAs(
  context: BrowserContext,
  credentials: { email: string; password: string }
): Promise<import('@playwright/test').Page> {
  const page = await context.newPage();
  await page.goto('/auth');

  // Password is the default sign-in method (the magic-link toggle was removed in
  // #137); wait for the always-rendered field once the page hydrates.
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 8000 });

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
// State 1: no group membership → redirect to /join
// ---------------------------------------------------------------------------

test('no-membership user is redirected to /join when visiting a protected route', async ({
  browser
}) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, SELF_SIGNUP_NO_MEMBER);

    // After sign-in the server detects no membership and redirects to /join.
    await expect(page).toHaveURL(/\/join/);

    // Navigating directly to a protected route also redirects to /join.
    await page.goto('/picks');
    await expect(page).toHaveURL(/\/join/);
  } finally {
    await context.close();
  }
});

test('no-membership user can access /join without being redirected again', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, SELF_SIGNUP_NO_MEMBER);
    const jb = joinPage(page);

    await jb.goto();
    // /join is an exempt path — no further redirect.
    await expect(page).toHaveURL(/\/join/);
    // The page should not bounce to /auth or /join/pending.
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page).not.toHaveURL(/\/join\/pending/);
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// State 2: pending membership → redirect to /join/pending
// ---------------------------------------------------------------------------

test('pending-membership user is redirected to /join/pending when visiting a protected route', async ({
  browser
}) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, SELF_SIGNUP_PENDING);

    // After sign-in the server detects a pending membership and redirects.
    await expect(page).toHaveURL(/\/join\/pending/);

    // Navigating directly to a protected route also redirects to /join/pending.
    await page.goto('/picks');
    await expect(page).toHaveURL(/\/join\/pending/);
  } finally {
    await context.close();
  }
});

test('pending-membership user can access /join paths without being redirected', async ({
  browser
}) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, SELF_SIGNUP_PENDING);
    const jb = joinPage(page);

    // /join/pending is under the exempt /join prefix.
    await jb.gotoPending();
    await expect(page).toHaveURL(/\/join\/pending/);
    await expect(page).not.toHaveURL(/\/auth/);
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// State 3: active membership → reaches the app
// ---------------------------------------------------------------------------

test(
  'active-membership user reaches /picks without being redirected',
  {
    tag: '@smoke'
  },
  async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await signInAs(context, SELF_SIGNUP_ACTIVE);

      // After sign-in the server resolves an active membership — no redirect.
      // The default post-login destination may vary; navigate explicitly to /picks.
      await page.goto('/picks');
      await expect(page).toHaveURL(/\/picks/);

      // Should not have been bounced to /join or /auth.
      await expect(page).not.toHaveURL(/\/join/);
      await expect(page).not.toHaveURL(/\/auth/);
    } finally {
      await context.close();
    }
  }
);

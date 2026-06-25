// tests/e2e/create-group.spec.ts
//
// E2E for the gated create-group flow (#148, ADR-0006 dec. 3).
//
// A no-membership user normally lands on /join. When that user has the
// can_create_group capability (gated mode), /join shows a "Create a group"
// form; submitting it makes them the commissioner of a fresh group and the app
// lets them through to /picks.
//
// Each test runs in an isolated browser context (no shared storageState) so
// sessions never leak. Users are created via supabase.auth.admin.createUser
// with email_confirm:true so they can password-login.

import { test, expect, type BrowserContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CREATOR = {
  email: 'e2e-create-group-capable@example.com',
  password: 'e2e-create-group-capable-pw-1',
  displayName: 'e2e-create-capable'
};

test.use({ storageState: { cookies: [], origins: [] } });

let supabase: SupabaseClient;
let creatorUserId: string;

test.beforeAll(async () => {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    throw new Error(
      'create-group.spec.ts: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set'
    );
  }
  supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

  // Gated mode is the default; assert it explicitly so the form is shown only
  // because the user is capable, not because creation is open to everyone.
  await supabase
    .from('settings')
    .upsert({ id: true, group_creation_mode: 'gated' }, { onConflict: 'id' });

  const { data, error } = await supabase.auth.admin.createUser({
    email: CREATOR.email,
    password: CREATOR.password,
    email_confirm: true,
    user_metadata: { display_name: CREATOR.displayName }
  });
  if (data?.user?.id) {
    creatorUserId = data.user.id;
  } else if (error && /already|exists|registered/i.test(error.message)) {
    const { data: list } = await supabase.auth.admin.listUsers();
    creatorUserId = list?.users.find((u) => u.email === CREATOR.email)?.id ?? '';
  }
  if (!creatorUserId) throw new Error('could not resolve creator user id');

  // Grant the capability and ensure the user starts with no membership.
  await supabase.from('users').upsert(
    {
      id: creatorUserId,
      display_name: CREATOR.displayName,
      role: 'player',
      can_create_group: true
    },
    { onConflict: 'id' }
  );
  await supabase.from('group_memberships').delete().eq('user_id', creatorUserId);
});

test.afterAll(async () => {
  if (!supabase) return;
  // Remove any groups this user created (cascades to config + memberships).
  const { data: memberships } = await supabase
    .from('group_memberships')
    .select('group_id')
    .eq('user_id', creatorUserId);
  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  if (groupIds.length > 0) await supabase.from('groups').delete().in('id', groupIds);
});

async function signInAs(
  context: BrowserContext,
  credentials: { email: string; password: string }
): Promise<import('@playwright/test').Page> {
  const page = await context.newPage();
  await page.goto('/auth');

  // The auth page defaults to password sign-in, so the fields are present once
  // the page hydrates. Retry the fill to absorb the hydration window.
  await expect(async () => {
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);

  const signInResponse = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signInResponse;

  return page;
}

test('capable no-membership user creates a group from /join and reaches the app', async ({
  browser
}) => {
  const context = await browser.newContext();
  try {
    const page = await signInAs(context, CREATOR);

    // No membership yet → lands on /join, which shows the create form.
    await expect(page).toHaveURL(/\/join/);
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    const groupName = `E2E Created Group ${Date.now()}`;
    await nameInput.fill(groupName);

    await expect(async () => {
      await page.getByRole('button', { name: 'Create group' }).click();
      // On success the action redirects to /picks (the new active group resolves).
      await expect(page).toHaveURL(/\/picks/, { timeout: 2000 });
    }).toPass({ timeout: 15000 });

    // The user is now an active commissioner of a real group.
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role, status, groups(name)')
      .eq('user_id', creatorUserId)
      .single();
    expect(membership?.role).toBe('commissioner');
    expect(membership?.status).toBe('active');
  } finally {
    await context.close();
  }
});

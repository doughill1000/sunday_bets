// tests/e2e/how-to-play.spec.ts
//
// Verifies the How to Play onboarding guide (#141):
//
//  - A fresh user (guide_seen_at IS NULL) sees the guide auto-open on first load.
//  - Dismissing sets guide_seen_at and the guide does not reopen on reload.
//  - A returning user (guide_seen_at set) never sees the auto-open.
//  - The "How to Play" account-menu item navigates to /how-to-play.
//
// Uses a dedicated fresh user so existing specs (which use the shared E2E user
// whose guide_seen_at is pre-set in global-setup.ts) remain unaffected.

import { test, expect } from '@playwright/test';
import { howToPlay } from './helpers/how-to-play';
import { makeServiceClient } from './helpers/seed';

const HOW_TO_PLAY_USER = {
  email: 'e2e-howtoplay@example.com',
  password: 'e2e-howtoplay-pw-1',
  displayName: 'e2e-htp'
};

const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

// Each test gets a fresh browser context — no shared storageState.
test.use({ storageState: { cookies: [], origins: [] } });

async function getSupabase() {
  return makeServiceClient();
}

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth');
  // Password is the default sign-in method (the magic-link toggle was removed in
  // #137); wait for the always-rendered field once the page hydrates.
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 15000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const signIn = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signIn;
}

let howToPlayUserId: string;

test.beforeAll(async () => {
  const supabase = await getSupabase();

  // Create the dedicated how-to-play test user (or resolve if it already exists).
  const { data, error } = await supabase.auth.admin.createUser({
    email: HOW_TO_PLAY_USER.email,
    password: HOW_TO_PLAY_USER.password,
    email_confirm: true,
    user_metadata: { display_name: HOW_TO_PLAY_USER.displayName }
  });
  if (data?.user?.id) {
    howToPlayUserId = data.user.id;
  } else if (error && /already|exists|registered/i.test(error.message)) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === HOW_TO_PLAY_USER.email);
    if (!existing) throw new Error('Could not resolve how-to-play user');
    howToPlayUserId = existing.id;
  } else {
    throw new Error(`ensureUser(${HOW_TO_PLAY_USER.email}) failed: ${error?.message ?? 'unknown'}`);
  }

  // Ensure public.users row with guide_seen_at NULL (reset each run so the
  // auto-open test starts from a clean state).
  await supabase.from('users').upsert(
    {
      id: howToPlayUserId,
      display_name: HOW_TO_PLAY_USER.displayName,
      role: 'player',
      guide_seen_at: null
    },
    { onConflict: 'id' }
  );
  // Force guide_seen_at to null in case the row existed with a value.
  await supabase.from('users').update({ guide_seen_at: null }).eq('id', howToPlayUserId);

  // Active group membership so the user reaches the picks page.
  await supabase
    .from('group_memberships')
    .upsert(
      { group_id: ORIGINAL_GROUP_ID, user_id: howToPlayUserId, role: 'member', status: 'active' },
      { onConflict: 'group_id,user_id' }
    );
  await supabase
    .from('group_memberships')
    .update({ status: 'active' })
    .eq('group_id', ORIGINAL_GROUP_ID)
    .eq('user_id', howToPlayUserId);
});

test('fresh user sees the How to Play guide auto-open on first load', async ({ page }) => {
  const htp = howToPlay(page);

  await signIn(page, HOW_TO_PLAY_USER.email, HOW_TO_PLAY_USER.password);
  await expect(page).toHaveURL(/\/picks/);

  // The guide overlay should become visible once the page hydrates.
  await expect(async () => {
    await htp.expectGuideVisible();
  }).toPass({ timeout: 15000 });
});

test('dismissing the guide persists across reload', async ({ page }) => {
  const htp = howToPlay(page);

  await signIn(page, HOW_TO_PLAY_USER.email, HOW_TO_PLAY_USER.password);
  await expect(page).toHaveURL(/\/picks/);

  // Wait for the guide to appear.
  await expect(async () => {
    await htp.expectGuideVisible();
  }).toPass({ timeout: 15000 });

  // Dismiss via the "Got it" button.
  await expect(async () => {
    await htp.dismissButton().click();
    await htp.expectGuideHidden();
  }).toPass({ timeout: 10000 });

  // Reload — guide must not reappear.
  await page.reload();
  await expect(page).toHaveURL(/\/picks/);
  await page.waitForLoadState('networkidle');
  await htp.expectGuideHidden();
});

test('returning user (guide_seen_at set) never sees the guide auto-open', async ({ page }) => {
  const htp = howToPlay(page);

  // Pre-set guide_seen_at so this user is "returning".
  const supabase = await getSupabase();
  await supabase
    .from('users')
    .update({ guide_seen_at: new Date().toISOString() })
    .eq('id', howToPlayUserId);

  await signIn(page, HOW_TO_PLAY_USER.email, HOW_TO_PLAY_USER.password);
  await expect(page).toHaveURL(/\/picks/);
  await page.waitForLoadState('networkidle');
  await htp.expectGuideHidden();

  // Reset for next run of the suite.
  await supabase.from('users').update({ guide_seen_at: null }).eq('id', howToPlayUserId);
});

test('account menu "How to Play" link navigates to /how-to-play', async ({ page }) => {
  const htp = howToPlay(page);

  // Use a returning user so the guide does not block the menu interaction.
  const supabase = await getSupabase();
  await supabase
    .from('users')
    .update({ guide_seen_at: new Date().toISOString() })
    .eq('id', howToPlayUserId);

  await signIn(page, HOW_TO_PLAY_USER.email, HOW_TO_PLAY_USER.password);
  await expect(page).toHaveURL(/\/picks/);

  // Open the account dropdown and wait for the menu item to appear.
  await expect(async () => {
    await htp.accountMenuTrigger().click();
    await expect(htp.howToPlayMenuItem()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });

  await htp.howToPlayMenuItem().click();
  await expect(page).toHaveURL(/\/how-to-play/);
  await expect(htp.pageHeading()).toBeVisible();
});

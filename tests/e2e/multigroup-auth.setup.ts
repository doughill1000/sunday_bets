import { test as setup, expect } from '@playwright/test';
import { E2E_MULTIGROUP_USER } from './test-user';

const authFile = 'playwright/.auth/multigroup-user.json';

// The original group ("Sunday Bets") seeded in global-setup. The multi-group
// user belongs to this group and the dedicated second group; we pin the active
// group here so the switcher's default label is deterministic (membership query
// order is otherwise undefined).
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

/**
 * Logs in as the dedicated multi-group user (member of two groups) and persists
 * the session, with the active group pinned to "Sunday Bets". Used by the
 * group-switcher multi-group specs via `storageState`.
 */
setup('authenticate multigroup user', async ({ page }) => {
  await page.goto('/auth');

  // Sign-in is the default mode, so the email + password fields render
  // immediately (server-side) — there is no method toggle to click (#137
  // removed magic-link sign-in). Wait for the password field before filling.
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="email"]').fill(E2E_MULTIGROUP_USER.email);
  await page.locator('input[name="password"]').fill(E2E_MULTIGROUP_USER.password);

  const signIn = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signIn;

  // Confirm the session took effect: a protected route must not bounce to /auth.
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/picks/);

  // Dismiss the AI recap flash modal if it opens (same storageState isolation as
  // auth.setup.ts — capture the "seen" key so group-switcher specs don't see it).
  const recapDismiss = page.getByTestId('recap-dismiss');
  await recapDismiss
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => recapDismiss.click())
    .catch(() => {
      /* no recap — nothing to dismiss */
    });

  // Pin the active group to "Sunday Bets" so the default switcher label is
  // deterministic. page.request shares the context cookie jar, so the
  // active_group_id cookie this sets is captured in storageState below.
  const res = await page.request.post('/api/groups/switch', {
    data: { groupId: ORIGINAL_GROUP_ID }
  });
  expect(res.ok()).toBeTruthy();

  await page.context().storageState({ path: authFile });
});

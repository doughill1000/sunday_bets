import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { E2E_USER, E2E_RESET_USER } from './test-user';

// These run without the stored session.
test.use({ storageState: { cookies: [], origins: [] } });

test('unauthenticated visit to a protected route redirects to /auth', async ({ page }) => {
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/auth/);
});

test('auth page renders the sign-in form', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText('Use your password or continue with Google.')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('form').getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('password sign-in updates the header account state after auth invalidation', async ({
  page
}) => {
  await page.goto('/auth');

  // Password is the default sign-in method (the magic-link toggle was removed in
  // #137); wait for the always-rendered field once the page hydrates.
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="email"]').fill(E2E_USER.email);
  await page.locator('input[name="password"]').fill(E2E_USER.password);

  const signIn = page.waitForResponse(
    (response) => response.url().includes('/auth') && response.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signIn;

  await expect(page).toHaveURL(/\/picks/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  await expect(page.getByText('E2')).toBeVisible();
});

test('sign-up form submits and shows confirmation message', async ({ page }) => {
  await page.goto('/auth');

  // Switch to sign-up mode. The CardTitle renders a <div data-slot="card-title">,
  // not a heading, and "Create account" also labels the submit button — so scope
  // the assertion to the card title element to stay unambiguous.
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page.locator('[data-slot="card-title"]')).toHaveText('Create account');

  // Fill in a unique email so repeated runs don't collide
  const uniqueEmail = `e2e-signup-${Date.now()}@example.com`;
  await page.locator('input[name="email"]').fill(uniqueEmail);
  await page.locator('input[name="password"]').fill('e2e-signup-pw-ok');

  const submitted = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Create account' }).click();
  await submitted;

  // Confirmation message appears via a svelte-sonner toast (email not yet
  // confirmed, so no redirect). Give it a timeout to absorb the post-response
  // toast render before it auto-dismisses.
  await expect(page.getByText('Check your email for a confirmation link')).toBeVisible({
    timeout: 5000
  });
});

test('password reset: token exchange lands on set-new-password page and redirects after update', async ({
  page
}) => {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  // Generate a recovery token directly (bypasses email delivery)
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: E2E_RESET_USER.email
  });
  if (error) throw new Error(`generateLink failed: ${error.message}`);

  const tokenHash = data.properties.hashed_token;
  if (!tokenHash) throw new Error('hashed_token missing from generateLink response');

  // Navigate to the reset landing with the recovery token
  await page.goto(`/auth/reset?token_hash=${tokenHash}&type=recovery`);

  // After token exchange the server redirects to the clean /auth/reset URL
  await expect(page).toHaveURL('/auth/reset');
  // CardTitle renders a <div>, not a heading — assert by text.
  await expect(page.getByText('Set new password')).toBeVisible();

  // Set the new password
  const newPassword = 'e2e-new-password-456';
  await page.locator('input[name="password"]').fill(newPassword);

  const submitted = page.waitForResponse(
    (r) => r.url().includes('/auth/reset') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Update password' }).click();
  await submitted;

  // Successful reset ends in a valid session and lands on /picks
  await expect(page).toHaveURL(/\/picks/);

  // Restore the reset user's original password so the next test run can also
  // generate a fresh recovery token (generateLink requires the user to exist).
  const {
    data: { users }
  } = await supabase.auth.admin.listUsers();
  const resetUser = users.find((u) => u.email === E2E_RESET_USER.email);
  if (resetUser) {
    await supabase.auth.admin.updateUserById(resetUser.id, {
      password: E2E_RESET_USER.password
    });
  }
});

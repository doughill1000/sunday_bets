import { test, expect } from '@playwright/test';
import { E2E_USER } from './test-user';

// These run without the stored session.
test.use({ storageState: { cookies: [], origins: [] } });

test('unauthenticated visit to a protected route redirects to /auth', async ({ page }) => {
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/auth/);
});

test('auth page renders the sign-in form', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText('Use a magic link or your password.')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('form').getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('password sign-in updates the header account state after auth invalidation', async ({
  page
}) => {
  await page.goto('/auth');

  await expect(async () => {
    await page.locator('#method-password').click();
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

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

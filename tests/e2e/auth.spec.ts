import { test, expect } from '@playwright/test';

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

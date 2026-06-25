import { test as setup, expect } from '@playwright/test';
import { E2E_USER } from './test-user';

const authFile = 'playwright/.auth/user.json';

/**
 * Logs in once through the real UI as the seeded admin user and persists the
 * session so authenticated specs can reuse it via `storageState`.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/auth');

  // The sign-in form defaults to email + password, so the password field is part
  // of the initial render (the old magic-link toggle was removed in #137). In dev
  // the page may still be hydrating, so wait for the field before interacting.
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="email"]').fill(E2E_USER.email);
  await page.locator('input[name="password"]').fill(E2E_USER.password);

  // The form submits via fetch; the auth cookie is set on that response, so
  // wait for it to settle before navigating. (Scope to the form — the header
  // also has a "Sign in" link.)
  const signIn = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signIn;

  // Confirm the session took effect: a protected route must not bounce to /auth.
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/picks/);

  await page.context().storageState({ path: authFile });
});

import { test as setup, expect } from '@playwright/test';
import { E2E_USER } from './test-user';

const authFile = 'playwright/.auth/user.json';

/**
 * Logs in once through the real UI as the seeded admin user and persists the
 * session so authenticated specs can reuse it via `storageState`.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/auth');

  // Sign-in is the default mode, so the email + password fields are rendered
  // immediately (server-side) — there is no method toggle to click (#137
  // removed magic-link sign-in). Wait for the password field before filling.
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

  // Dismiss the AI recap flash modal if it opens (localStorage is empty the first time
  // through, so the "seen" guard doesn't fire). Saving the state below captures the
  // localStorage "seen" key, so all subsequent specs reusing this storageState won't
  // see the modal at all.
  const recapDismiss = page.getByTestId('recap-dismiss');
  await recapDismiss
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => recapDismiss.click())
    .catch(() => {
      /* no recap — nothing to dismiss */
    });

  await page.context().storageState({ path: authFile });
});

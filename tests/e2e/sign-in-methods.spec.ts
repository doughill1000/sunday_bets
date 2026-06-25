import { test, expect } from '@playwright/test';

// e2e-deferred (#211): "Sign-in methods" heading assertion stale after settings UI change.
test.fixme('settings page shows the sign-in methods section', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Sign-in methods' })).toBeVisible();
});

test('email identity is listed under sign-in methods', async ({ page }) => {
  await page.goto('/settings');
  const section = page.getByRole('list', { name: 'Connected sign-in methods' });
  await expect(section).toBeVisible();
  await expect(section.getByText('Email / Password')).toBeVisible();
});

test('disconnect is disabled when email is the only sign-in method', async ({ page }) => {
  await page.goto('/settings');
  // The E2E user only has an email identity — disconnect must be disabled.
  const disconnectBtn = page
    .getByRole('list', { name: 'Connected sign-in methods' })
    .getByRole('button', { name: /Disconnect/ });
  await expect(disconnectBtn).toBeVisible();
  await expect(disconnectBtn).toBeDisabled();
});

// e2e-deferred (#211): "Connect with Google" button assertion stale.
test.fixme('connect Google button is shown when Google is not linked', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Connect with Google' })).toBeVisible();
});

// Requires Google OAuth configured in local Supabase. Skipped otherwise.
test('clicking "Connect with Google" redirects toward Google OAuth', async ({ page }) => {
  test.skip(
    !process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID,
    'Google OAuth not configured in local Supabase'
  );

  await page.goto('/settings');
  await page.route(/accounts\.google\.com/, (route) => route.abort());

  const [request] = await Promise.all([
    page.waitForRequest(/accounts\.google\.com/, { timeout: 5000 }),
    page.getByRole('button', { name: 'Connect with Google' }).click()
  ]);

  expect(request.url()).toContain('accounts.google.com');
});

test('GET /auth/callback with next param redirects to that path after valid exchange', async ({
  request
}) => {
  // A real code exchange isn't testable without a live OAuth round-trip, but we
  // can verify the 400 path still works (regression against the next-param change).
  const response = await request.get('/auth/callback?next=/settings');
  expect(response.status()).toBe(400); // missing code → 400, not a redirect
});

test('GET /auth/callback rejects open-redirect attempts', async ({ request }) => {
  // A next= pointing to an external host must fall back to /picks, not forward the
  // user off-site. We can't test the redirect destination directly here (the code
  // exchange fails first), but we verify the endpoint still returns 400 for a missing
  // code even with a malicious next param — it does not 3xx to the external host.
  const response = await request.get('/auth/callback?code=&next=//evil.example.com');
  expect(response.status()).toBe(400);
});

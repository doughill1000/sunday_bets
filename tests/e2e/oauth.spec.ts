import { test, expect } from '@playwright/test';

// These run against the unauthenticated sign-in page.
test.use({ storageState: { cookies: [], origins: [] } });

test('auth page shows "Continue with Google" button', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

// Requires Google OAuth configured in the local Supabase (SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID /
// SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET set before `supabase start`). Skipped otherwise — the
// redirect round-trip is covered by the manual iOS PWA device test in the acceptance criteria.
test('clicking "Continue with Google" redirects to Google OAuth', async ({ page }) => {
  test.skip(
    !process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID,
    'Google OAuth not configured in local Supabase — set SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID before supabase start'
  );

  await page.goto('/auth');

  // Abort Google navigation so the test stays self-contained.
  await page.route(/accounts\.google\.com/, (route) => route.abort());

  const [request] = await Promise.all([
    page.waitForRequest(/accounts\.google\.com/, { timeout: 5000 }),
    page.getByRole('button', { name: 'Continue with Google' }).click()
  ]);

  expect(request.url()).toContain('accounts.google.com');
  expect(request.url()).toContain('response_type=code');
});

test('GET /auth/callback with no code returns 400', async ({ request }) => {
  const response = await request.get('/auth/callback');
  expect(response.status()).toBe(400);
});

test('GET /auth/callback with an invalid code returns 400', async ({ request }) => {
  const response = await request.get('/auth/callback?code=not-a-real-oauth-code');
  expect(response.status()).toBe(400);
});

// Regression: existing sign-in methods must still work after adding OAuth.
// Full password sign-in flow is covered by auth.spec.ts — these guard the page
// structure so both paths remain reachable.
test('password fields are still present alongside the Google button', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.locator('input[name="email"]')).toBeVisible();
  // Scope to the form to avoid strict-mode ambiguity with any header "Sign in" link.
  await expect(page.locator('form').getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

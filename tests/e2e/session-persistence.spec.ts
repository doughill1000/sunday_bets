import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the iPhone-PWA auth bug.
 *
 * Root cause of the original bug: iOS WebKit discards a standalone PWA's
 * localStorage (and session-only cookies) between home-screen launches, so a
 * Supabase session kept in localStorage is lost and the user has to log in on
 * every relaunch. The fix is that the whole app authenticates through
 * `@supabase/ssr` cookie storage (`createBrowserClient` / `createServerClient`
 * in `src/routes/+layout.ts` and `src/hooks.server.ts`), which writes the
 * session to a persistent (400-day Max-Age) cookie that `hooks.server.ts`
 * restores on the next server request.
 *
 * These specs run with the authenticated storageState from `auth.setup.ts`
 * (the default `chromium` project), so they start already signed in.
 */

// Matches the Supabase session cookie/localStorage key (`sb-<ref>-auth-token`,
// including its chunked `…-auth-token.0` variants).
const SUPABASE_AUTH_KEY = /sb-.*-auth-token/;

test('Supabase session is stored in a persistent cookie, not localStorage', async ({ page }) => {
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/picks/); // sanity: we start authenticated

  // The session must live in a Supabase auth cookie…
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((c) => SUPABASE_AUTH_KEY.test(c.name));
  expect(authCookie, 'expected a Supabase sb-*-auth-token cookie').toBeTruthy();

  // …and that cookie must be persistent — a real Expires/Max-Age in the future,
  // not a session cookie. Session cookies (Playwright reports `expires === -1`)
  // are exactly what iOS drops on a PWA relaunch.
  expect(authCookie!.expires).toBeGreaterThan(Date.now() / 1000);

  // The session must NOT be in localStorage (the iOS-fragile storage we moved
  // off of). Guards against a regression that passes `storage: localStorage`
  // or otherwise bypasses the @supabase/ssr cookie helpers.
  const supabaseLocalStorageKeys = await page.evaluate(
    (keyPattern) => Object.keys(localStorage).filter((k) => new RegExp(keyPattern).test(k)),
    SUPABASE_AUTH_KEY.source
  );
  expect(supabaseLocalStorageKeys).toEqual([]);
});

test('session survives a simulated iOS PWA cold relaunch (cookies only)', async ({
  browser,
  baseURL,
  page
}) => {
  await page.goto('/picks');
  await expect(page).toHaveURL(/\/picks/);

  // Mimic an iOS standalone-PWA relaunch: keep only persistent cookies and drop
  // localStorage + session-only cookies — everything WebKit throws away. If the
  // session cookie were session-scoped it would be filtered out here, so this
  // also asserts the cookie's persistence end to end.
  const nowSec = Date.now() / 1000;
  const persistentCookies = (await page.context().cookies()).filter((c) => c.expires > nowSec);

  const relaunched = await browser.newContext({
    baseURL,
    storageState: { cookies: persistentCookies, origins: [] }
  });
  try {
    const relaunchedPage = await relaunched.newPage();
    await relaunchedPage.goto('/picks');
    // hooks.server.ts restores the session from the cookie, so a protected route
    // loads without bouncing to /auth. A localStorage-backed session would be
    // gone in this fresh context and would redirect to /auth, failing here.
    await expect(relaunchedPage).toHaveURL(/\/picks/);
  } finally {
    await relaunched.close();
  }
});

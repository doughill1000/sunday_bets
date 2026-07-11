// THROWAWAY design-study capture spec. Copy to tests/capture/<feature>.capture.ts.
//   1. Replace __SCRATCHPAD__ with THIS session's scratchpad path (from the system prompt).
//   2. Trim PUBLIC / APP down to the routes your study actually touches.
// admin@example.com is in both demo groups with rich data — sign in for the authed app.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '__SCRATCHPAD__\\screens';
mkdirSync(OUT, { recursive: true });

async function shoot(page: Page, name: string, settle = 1200) {
  await page.waitForLoadState('load').catch(() => {});
  // Realtime websockets mean networkidle never fires; a fixed settle lets the
  // client-side (tanstack) data paint before the shot.
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}\\${name}.png`, fullPage: true });
}

// Reachable without auth (public onboarding + the public demo snapshot).
const PUBLIC: [string, string][] = [
  ['demo-picks', '/demo'],
  ['demo-leaderboard', '/demo/leaderboard']
];

// The authenticated app — trim to the screens in scope for the study.
const APP: [string, string][] = [
  ['stats', '/stats'],
  ['league', '/league']
];

test('capture public + demo screens', async ({ page }) => {
  for (const [name, path] of PUBLIC) {
    await page.goto(path);
    await shoot(page, `public-${name}`);
  }
});

test('capture authenticated app screens', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark'
  });
  const page = await ctx.newPage();

  await page.goto('/auth');
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('input[name="email"]').fill('admin@example.com');
  await page.locator('input[name="password"]').fill('password');
  const signIn = page.waitForResponse(
    (r) => r.url().includes('/auth') && r.request().method() === 'POST'
  );
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await signIn;

  await page.goto('/picks');
  await expect(page).toHaveURL(/\/picks/, { timeout: 15_000 });

  // Dismiss the AI-recap flash modal if it opens over the first authed page.
  const dismiss = page.getByTestId('recap-dismiss');
  await dismiss
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => dismiss.click())
    .catch(() => {});

  for (const [name, path] of APP) {
    await page.goto(path);
    await shoot(page, `app-${name}`);
  }

  await ctx.close();
});

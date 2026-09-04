// tests/e2e/demo-how-to-play.spec.ts
//
// Verifies the public rules door on /demo (#864):
//
//  - An unauthenticated visitor reaches the full rules in one action, with no /auth redirect.
//  - The rules render the shared HowToPlay component (same sections as the authed page).
//  - The demo nav and bottom tab bar still show exactly the five tabs.
//
// The demo serves a committed snapshot (ADR-0026) and this page is static markup, so no DB
// seeding is needed — only a session-less browser context.

import { test, expect } from '@playwright/test';

// No shared storageState — the whole point is the session-less path.
test.use({ storageState: { cookies: [], origins: [] } });

const TABS = ['Picks', 'Week', 'League', 'Stats', 'Market'];

test('unauthenticated visitor reaches the rules from /demo in one action', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/demo$/);

  // The how-to-play popup auto-opens on every visit; dismiss it to reach the banner re-entry
  // door underneath (the auto-open path has its own spec, demo-welcome-guide).
  await page.getByTestId('demo-guide-dismiss').click();

  await page.getByTestId('demo-how-to-play-link').click();

  await expect(page).toHaveURL(/\/demo\/how-to-play$/);
  await expect(page.getByTestId('demo-how-to-play-heading')).toBeVisible();

  // The shared HowToPlay component's own sections, not a forked copy.
  await expect(page.getByRole('heading', { name: 'Picking against the spread' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The All-In' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scoring' })).toBeVisible();
});

test('the demo rules page never redirects to /auth', async ({ page }) => {
  await page.goto('/demo/how-to-play');
  await expect(page).toHaveURL(/\/demo\/how-to-play$/);
  await expect(page.getByTestId('demo-how-to-play-heading')).toBeVisible();

  // And the way back out is present (the nav never links here).
  await page.getByTestId('demo-how-to-play-back').click();
  await expect(page).toHaveURL(/\/demo$/);
});

test('the demo tab bars still show exactly the five tabs', async ({ page }) => {
  await page.goto('/demo/how-to-play');

  // Counted rather than asserted visible: the top nav is `hidden sm:flex` and the bottom bar
  // `sm:hidden`, so exactly one of the two is on screen at any given viewport.
  for (const prefix of ['demo-nav-', 'demo-tab-']) {
    await expect(page.locator(`[data-testid^="${prefix}"]`)).toHaveCount(TABS.length);
    for (const label of TABS) {
      await expect(page.getByTestId(`${prefix}${label.toLowerCase()}`)).toHaveCount(1);
    }
  }
});

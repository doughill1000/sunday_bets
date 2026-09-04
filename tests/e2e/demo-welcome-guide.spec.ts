// tests/e2e/demo-welcome-guide.spec.ts
//
// The demo how-to-play popup (builds on #864, ADR-0026): a stranger landing on /demo is taught
// the game on arrival, every visit.
//
//  - Visiting /demo auto-opens the popup with the full shared HowToPlay rules.
//  - It opens again on the next visit — the dismissal is not remembered (marketing surface).
//  - It does not stack on top of the standalone /demo/how-to-play page.
//
// Static committed snapshot (ADR-0026), so no DB seeding — only a session-less browser context.

import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('visiting /demo auto-opens the full-rules popup', async ({ page }) => {
  await page.goto('/demo');

  const guide = page.getByTestId('demo-welcome-guide');
  await expect(guide).toBeVisible();

  // The shared HowToPlay component's own sections — the full rules, not a summary.
  await expect(guide.getByRole('heading', { name: 'Picking against the spread' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'The All-In' })).toBeVisible();

  await page.getByTestId('demo-guide-dismiss').click();
  await expect(guide).toBeHidden();
});

test('the popup opens again on the next visit (no remembered dismissal)', async ({ page }) => {
  await page.goto('/demo');
  await page.getByTestId('demo-guide-dismiss').click();
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();

  await page.reload();
  await expect(page.getByTestId('demo-welcome-guide')).toBeVisible();
});

test('the popup does not stack on the standalone rules page', async ({ page }) => {
  await page.goto('/demo/how-to-play');
  await expect(page.getByTestId('demo-how-to-play-heading')).toBeVisible();
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
});

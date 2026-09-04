// tests/e2e/demo-welcome-guide.spec.ts
//
// The demo first-teach primer (builds on #864, ADR-0026): a stranger landing on /demo is taught
// the game once, then never nagged again.
//
//  - First visit to /demo auto-opens the primer; dismissing it persists (per-browser) so a
//    reload does not re-open it.
//  - A returning visitor (flag already set) is not interrupted.
//  - Landing directly on the full rules page does not stack the primer on top of it.
//  - "Read the full rules" reaches the canonical page and also counts as taught.
//
// Static committed snapshot (ADR-0026), so no DB seeding — only a session-less browser context.

import { test, expect } from '@playwright/test';

const SEEN_KEY = 'hotshot:demo-guide-seen';

test.use({ storageState: { cookies: [], origins: [] } });

test('first visit auto-opens the primer, and dismissing it sticks', async ({ page }) => {
  await page.goto('/demo');

  const guide = page.getByTestId('demo-welcome-guide');
  await expect(guide).toBeVisible();
  await expect(guide.getByTestId('demo-guide-primer').getByRole('listitem')).toHaveCount(4);

  await page.getByTestId('demo-guide-dismiss').click();
  await expect(guide).toBeHidden();

  // The dismissal is remembered — a reload does not re-open it.
  await page.reload();
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
});

test('a returning visitor is not interrupted', async ({ page }) => {
  await page.addInitScript(
    ([key]) => {
      try {
        localStorage.setItem(key, '2026-01-01T00:00:00Z');
      } catch {
        /* storage blocked */
      }
    },
    [SEEN_KEY]
  );

  await page.goto('/demo');
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
});

test('landing directly on the full rules does not stack the primer', async ({ page }) => {
  await page.goto('/demo/how-to-play');
  await expect(page.getByTestId('demo-how-to-play-heading')).toBeVisible();
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
});

test('"Read the full rules" reaches the rules page and counts as taught', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByTestId('demo-welcome-guide')).toBeVisible();

  await page.getByTestId('demo-guide-full-rules').click();

  await expect(page).toHaveURL(/\/demo\/how-to-play$/);
  await expect(page.getByTestId('demo-how-to-play-heading')).toBeVisible();

  // Going back to /demo does not re-open the primer — reading the rules is first-teach done.
  await page.goto('/demo');
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
});

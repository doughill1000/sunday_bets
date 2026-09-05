// tests/e2e/demo-award-popover.spec.ts
//
// Tap-to-explain on the season award chips (#881), exercised on /demo because the demo mounts
// the same shared LeagueHonors (ADR-0026) — so this covers the unauthenticated surface and the
// real portal/anchoring that jsdom cannot show.
//
// Static committed snapshot (ADR-0026), so no DB seeding — only a session-less browser context.

import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function openHonors(page: import('@playwright/test').Page) {
  await page.goto('/demo/league');
  // The demo teaches the game on arrival and its overlay would swallow the tab click.
  await page.getByTestId('demo-guide-dismiss').click();
  await expect(page.getByTestId('demo-welcome-guide')).toBeHidden();
  await page.getByTestId('demo-league-tab-honors').click();
  await expect(page.getByTestId('league-honors')).toBeVisible();
}

test('tapping an award chip opens a popover pinned to it, and Esc dismisses it', async ({
  page
}) => {
  await openHonors(page);

  const chip = page.locator('[data-testid^="badge-chip-"]').first();
  const id = (await chip.getAttribute('data-testid'))!.replace('badge-chip-', '');
  const popover = page.getByTestId(`badge-popover-${id}`);

  await expect(popover).toBeHidden();
  await chip.click();
  await expect(popover).toBeVisible();

  // The flavor line and the criteria — the copy the bare chip never showed on a phone.
  await expect(popover).toContainText(await chip.innerText());
  expect((await popover.innerText()).length).toBeGreaterThan((await chip.innerText()).length);

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
});

test('the chip is a compact button and only one popover is open at a time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHonors(page);

  const chips = page.locator('[data-testid^="badge-chip-"]');
  const first = chips.nth(0);
  const second = chips.nth(1);

  expect(await first.evaluate((el) => el.tagName)).toBe('BUTTON');
  expect((await first.boundingBox())!.height).toBeLessThanOrEqual(33);

  const firstId = (await first.getAttribute('data-testid'))!.replace('badge-chip-', '');
  const secondId = (await second.getAttribute('data-testid'))!.replace('badge-chip-', '');

  await first.click();
  await expect(page.getByTestId(`badge-popover-${firstId}`)).toBeVisible();

  await second.click();
  await expect(page.getByTestId(`badge-popover-${firstId}`)).toBeHidden();
  await expect(page.getByTestId(`badge-popover-${secondId}`)).toBeVisible();
});

test('award rows stay compact and opening a popover preserves focus and scroll', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHonors(page);

  const titleRows = page.getByTestId('awards-titles').locator('li');
  const firstRow = (await titleRows.nth(0).boundingBox())!;
  const secondRow = (await titleRows.nth(1).boundingBox())!;

  // At the 390px mobile canvas, rows stay at 32px and the list adds no second gutter.
  expect(firstRow.height).toBeLessThanOrEqual(33);
  expect(secondRow.y - (firstRow.y + firstRow.height)).toBeLessThanOrEqual(1);

  const chip = titleRows.nth(1).locator('[data-testid^="badge-chip-"]');
  await chip.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await chip.focus();
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);

  await chip.press('Enter');
  await expect(page.locator('[data-testid^="badge-popover-"]:visible')).toBeVisible();
  await expect(chip).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);
});

test('the Awards legend still opens its own sheet, unnested', async ({ page }) => {
  await openHonors(page);

  // #881 anchors the one you tapped; the legend still holds the whole shelf (and the popover
  // never opens from inside it — DESIGN.md P3, no disclosure nested in a disclosure).
  await page.getByRole('button', { name: 'Awards legend' }).click();
  const guide = page.getByTestId('awards-guide');
  await expect(guide).toBeVisible();
  await expect(guide.locator('[data-testid^="badge-chip-"]')).toHaveCount(0);
});

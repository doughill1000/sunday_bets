import { expect, test } from '@playwright/test';

// Primary navigation after the #305 IA refactor: four first-class tabs
// (Picks · Leaderboard · Stats · Group). The desktop inline nav and the mobile
// bottom tab bar render the same four destinations; League Honors now lives on
// /group and is gone from /stats.

const TABS = [
  { href: '/picks', name: 'Picks' },
  { href: '/leaderboard', name: 'Leaderboard' },
  { href: '/stats', name: 'Stats' },
  { href: '/group', name: 'Group' }
] as const;

test(
  'desktop nav exposes all four tabs and each navigates',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/picks');

    const nav = page.getByTestId('primary-nav');
    for (const { name } of TABS) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }

    for (const { href, name } of TABS) {
      await page.goto('/picks');
      await page.getByTestId('primary-nav').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
    }
  }
);

test('mobile bottom tab bar exposes all four tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/picks');

  const bar = page.getByTestId('bottom-tab-bar');
  await expect(bar).toBeVisible();
  for (const { href } of TABS) {
    await expect(bar.locator(`a[href="${href}"]`)).toBeVisible();
  }
});

test('League Honors lives on /group, not /stats', async ({ page }) => {
  // Moved off Stats by #305 — the card must no longer mount there.
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();
  await expect(page.getByTestId('league-honors')).toHaveCount(0);

  // The Group tab is the new home. The honors card only renders once a season has
  // a champion or awarded badges, so assert the destination loads rather than the
  // (data-dependent) card itself.
  await page.goto('/group');
  await expect(page).toHaveURL(/\/group$/);
  await expect(page.getByRole('list', { name: 'Group members' })).toBeVisible();
});

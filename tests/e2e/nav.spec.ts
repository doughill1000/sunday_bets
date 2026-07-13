import { expect, test } from '@playwright/test';

// Primary navigation: four first-class tabs — Picks · League · Stats · Market. The desktop inline
// nav and the mobile bottom tab bar render the same four destinations. League is the merged
// Leaderboard + Group home (standings, the season race, honors, and a Members & manage subpage at
// /league/manage); Market is the NFL-wide ATS surface (renamed from "Teams" so the tab names the
// market concept and never collides with "League", the user's group).

const TABS = [
  { href: '/picks', name: 'Picks' },
  { href: '/league', name: 'League' },
  { href: '/stats', name: 'Stats' },
  { href: '/market', name: 'Market' }
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

test('League tab stays active on both the home and its manage subpage', async ({ page }) => {
  const league = () =>
    page.getByTestId('primary-nav').getByRole('link', { name: 'League', exact: true });

  await page.goto('/league');
  await expect(league()).toHaveAttribute('aria-current', 'page');

  await page.goto('/league/manage');
  await expect(league()).toHaveAttribute('aria-current', 'page');
});

test('legacy routes redirect to the League home and manage subpage', async ({ page }) => {
  // The standalone Leaderboard and Group tabs became the League home and its Members & manage
  // subpage (#561); their old paths permanently forward (hooks 308).
  await page.goto('/leaderboard');
  await expect(page).toHaveURL(/\/league$/);

  await page.goto('/group');
  await expect(page).toHaveURL(/\/league\/manage$/);
});

test('League honors live on /league, not /stats or /league/manage', async ({ page }) => {
  // Off Stats since #305, and off the manage subpage after #561 relocated the honors case to the
  // League home. The card only renders once a season has a champion or awarded badges, so on
  // /league assert the destination loads (the Members & manage entry) rather than the
  // data-dependent card itself.
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();
  await expect(page.getByTestId('league-honors')).toHaveCount(0);

  await page.goto('/league/manage');
  await expect(page).toHaveURL(/\/league\/manage$/);
  await expect(page.getByRole('list', { name: 'Group members' })).toBeVisible();
  await expect(page.getByTestId('league-honors')).toHaveCount(0);

  await page.goto('/league');
  await expect(page.getByTestId('manage-entry')).toBeVisible();
});

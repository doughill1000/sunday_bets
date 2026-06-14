import { test, expect } from '@playwright/test';

test('leaderboard renders the weekly and totals views', async ({ page }) => {
  await page.goto('/leaderboard');

  await expect(page.getByRole('tab', { name: 'Weekly' })).toBeVisible();
  const totalsTab = page.getByRole('tab', { name: 'Totals' });
  await expect(totalsTab).toBeVisible();

  // Weekly is the default view.
  await expect(page.getByText('Weekly Progress')).toBeVisible();

  // Switch to Totals. The first click can be dropped while the page is still
  // hydrating in dev, so retry until the standings table appears.
  await expect(async () => {
    await totalsTab.click();
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
});

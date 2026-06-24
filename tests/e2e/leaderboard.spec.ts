import { test, expect } from '@playwright/test';

test('leaderboard renders standings view', async ({ page }) => {
  await page.goto('/leaderboard');

  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

  // No tabs — the page is a single standings view.
  await expect(page.getByRole('tab', { name: 'Weekly' })).not.toBeVisible();
  await expect(page.getByRole('tab', { name: 'Totals' })).not.toBeVisible();

  // Standings table headers are visible (with data) or the empty-state card is shown.
  const hasStandings = await page.getByRole('columnheader', { name: 'Player' }).isVisible();
  if (hasStandings) {
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible();
  } else {
    await expect(page.getByText('No standings yet')).toBeVisible();
  }
});

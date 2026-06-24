import { test, expect } from '@playwright/test';

test('leaderboard renders Standings and Weekly tabs', async ({ page }) => {
  await page.goto('/leaderboard');

  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

  // Both tabs are present.
  await expect(page.getByRole('tab', { name: 'Standings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Weekly' })).toBeVisible();

  // Standings is the default tab: table headers or empty state visible.
  const hasStandings = await page.getByRole('columnheader', { name: 'Player' }).isVisible();
  if (hasStandings) {
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible();
  } else {
    await expect(page.getByText('No standings yet')).toBeVisible();
  }

  // Switch to Weekly tab and confirm a week label or empty state renders.
  const weeklyTab = page.getByRole('tab', { name: 'Weekly' });
  await expect(async () => {
    await weeklyTab.click();
    // Either a week label, a game card, or an empty-state message should be visible.
    await expect(
      page.locator('text=/Week \\d+|No weeks have started|No games this week/')
    ).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 15000 });
});

import { expect, test } from '@playwright/test';

test('authenticated player can open the stats experience', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/stats');

  await expect(page).toHaveURL(/\/stats/);
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();

  const trend = page.getByTestId('season-trend-chart');
  const emptyState = page.getByText('No settled picks yet');
  await expect(trend.or(emptyState)).toBeVisible();
});

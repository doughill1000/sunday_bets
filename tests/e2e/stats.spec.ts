import { expect, test } from '@playwright/test';

test('authenticated player can open the stats experience', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/stats');

  await expect(page).toHaveURL(/\/stats/);
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();

  // Either the consolidated context bar rendered (data loaded) or the empty state. The
  // accuracy tables + trend now sit behind progressive disclosure (#518), so we assert on
  // the always-present control bar rather than a demoted, collapsed section.
  const contextBar = page.getByTestId('stats-context-bar');
  const emptyState = page.getByText('No settled picks yet');
  await expect(contextBar.or(emptyState)).toBeVisible();
});

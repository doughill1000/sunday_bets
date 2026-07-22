import { expect, test } from '@playwright/test';

// The NFL-wide ATS surface in its lean form (#692): the week slate, the "Where the market
// bends" synthesis, and the team book — no scope dropdown and no "Slice by" drill-in slices
// (the 2026-07-16 product audit's Reshape verdict). The internal plumbing (the `league-*`
// testids, /api/league) intentionally keeps its old names — that is a separate refactor. Like
// the /stats sibling this stays a smoke test — the e2e seed may carry no graded ATS data, so
// it asserts the always-present structure (heading + slate card) and the absence of the
// retired explorer controls rather than data-dependent panels.
test('authenticated player can open the Market experience', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/market');

  await expect(page).toHaveURL(/\/market/);
  await expect(page.getByRole('heading', { name: 'Market', exact: true })).toBeVisible();

  // The pre-pick companion leads the page regardless of data (it owns its own empty state).
  await expect(page.getByTestId('league-slate')).toBeVisible();

  // The explorer is retired: no page-level scope dropdown, no "Slice by" chip row, and no
  // Teams/Trends tab bar.
  await expect(page.getByTestId('league-scope-select')).toHaveCount(0);
  await expect(page.getByTestId('league-slice-chip')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Trends' })).toHaveCount(0);
});

test('the legacy /teams path permanently redirects to /market', async ({ page }) => {
  // /teams was the tab's home before it was renamed to /market; the redirect (hooks 308) keeps any
  // old deep link working.
  await page.goto('/teams');
  await expect(page).toHaveURL(/\/market$/);
});

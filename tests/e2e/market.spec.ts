import { expect, test } from '@playwright/test';

// The NFL-wide ATS surface. Renamed /teams → /market so the tab names the market concept it is
// built around and never collides with "League" (the user's own group); the page itself is
// unchanged — one page-level season dropdown plus a "Slice by" chip row (#529). The internal
// plumbing (the `league-*` testids, /api/league) intentionally keeps its old names — that is a
// separate refactor. Like the /stats sibling this stays a smoke test — the e2e seed may carry no
// graded ATS data, so it asserts the always-present merged controls (scope dropdown + the "By team"
// slice, which renders regardless of data) rather than data-dependent panels.
test('authenticated player can open the Market experience', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/market');

  await expect(page).toHaveURL(/\/market/);
  await expect(page.getByRole('heading', { name: 'Market', exact: true })).toBeVisible();

  // The single page-level scope control replaces the old per-tab picker + Trends toggle, and
  // offers the pooled window as a pinned option.
  const scopeSelect = page.getByTestId('league-scope-select');
  await expect(scopeSelect).toBeVisible();
  await expect(scopeSelect.getByRole('option', { name: /Last 5 · pooled/ })).toHaveCount(1);

  // "By team" is always the first slice — the former standalone team list, now just the default lens.
  await expect(page.getByTestId('league-slice-chip').filter({ hasText: 'By team' })).toBeVisible();

  // There must never be a Teams/Trends tab bar anymore.
  await expect(page.getByRole('tab', { name: 'Trends' })).toHaveCount(0);
});

test('the legacy /teams path permanently redirects to /market', async ({ page }) => {
  // /teams was the tab's home before it was renamed to /market; the redirect (hooks 308) keeps any
  // old deep link working.
  await page.goto('/teams');
  await expect(page).toHaveURL(/\/market$/);
});

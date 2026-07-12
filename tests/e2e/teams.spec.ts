import { expect, test } from '@playwright/test';

// The former "League" market tab is now "Teams" (#561): the NFL league-wide ATS analytics live at
// /teams so the user's own league can own the "League" name. The page itself is unchanged — one
// page-level season dropdown plus a "Slice by" chip row (#529). Like the /stats sibling this stays
// a smoke test — the e2e seed may carry no graded league ATS data, so it asserts the always-present
// merged controls (scope dropdown + the "By team" slice, which renders regardless of data) rather
// than data-dependent panels.
test(
  'authenticated player can open the Teams market experience',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/teams');

    await expect(page).toHaveURL(/\/teams/);
    await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();

    // The single page-level scope control replaces the old Teams picker + Trends toggle, and offers
    // the pooled window as a pinned option.
    const scopeSelect = page.getByTestId('league-scope-select');
    await expect(scopeSelect).toBeVisible();
    await expect(scopeSelect.getByRole('option', { name: /Last 5 · pooled/ })).toHaveCount(1);

    // "By team" is always the first slice — the old Teams tab, now just the default lens.
    await expect(
      page.getByTestId('league-slice-chip').filter({ hasText: 'By team' })
    ).toBeVisible();

    // There must never be a Teams/Trends tab bar anymore.
    await expect(page.getByRole('tab', { name: 'Trends' })).toHaveCount(0);
  }
);

import { expect, test } from '@playwright/test';

test('authenticated player can open the stats experience', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/stats');

  await expect(page).toHaveURL(/\/stats/);
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();

  // Either the consolidated context bar rendered (data loaded) or the empty state. The
  // data-dependent breakdown cuts now share one chip selector (#538), so this smoke test
  // anchors on the always-present control bar rather than a particular seeded panel.
  const contextBar = page.getByTestId('stats-context-bar');
  const emptyState = page.getByText('No settled picks yet');
  await expect(contextBar.or(emptyState)).toBeVisible();
});

test('a bare visit opens on a season, and ?scope=career deep-links the career window', async ({
  page
}) => {
  const scope = page.getByLabel('Select season or career');

  // #738: /stats opens on a season in EVERY month — the last graded one through the offseason.
  // Career used to be the offseason default, which made this same URL render a different page
  // either side of a calendar boundary. It is now only ever an explicit choice.
  await page.goto('/stats');
  await expect(scope).toBeVisible();
  await expect(scope).not.toHaveValue('career');

  // ...and that explicit choice is addressable, mirroring /league's `?scope=alltime` (#737), so
  // the Career window — the credibility rating's canonical home — stays a shareable URL now
  // that nobody lands on it by default.
  await page.goto('/stats?scope=career');
  await expect(scope).toHaveValue('career');
});

import { test, expect } from '@playwright/test';
import { wrappedPage } from './helpers/wrapped-page';
import { leaderboardPage } from './helpers/leaderboard-page';

// Selectors live in the wrappedPage page object (helpers/wrapped-page.ts)
// and key off data-testid anchors so copy changes don't ripple here.

test('wrapped page renders a story or empty state', { tag: '@smoke' }, async ({ page }) => {
  const wp = wrappedPage(page);
  await wp.goto();

  // Either a Wrapped story renders (season data exists) or the empty state renders
  // (season not yet generated). One of them must always be visible. The once-per-season
  // flash never appears on /wrapped itself (#548) — the page already shows the same
  // content, so layering the flash on top would double-render the screen the user is
  // already on.
  await expect(wp.storyOrEmpty()).toBeVisible();
});

test('wrapped flash modal is dismissable', async ({ page }) => {
  const wp = wrappedPage(page);

  // The flash is mounted app-wide (like the recap flash), not on /wrapped itself
  // (#548) — visit another authed page first, where it would actually appear if unseen.
  await page.goto('/league');
  await wp.dismissFlashIfOpen();
  await expect(wp.flash()).not.toBeVisible();

  // /wrapped itself still renders normally afterward.
  await wp.goto();
  await expect(wp.storyOrEmpty()).toBeVisible();
});

test('wrapped offers a way back to the League', async ({ page }) => {
  // Season Wrapped is reached from the /league honors card and the flash, never from the
  // nav — so like the recap archive it must carry its own exit (#768, DESIGN.md principle 8).
  const wp = wrappedPage(page);
  await wp.goto();

  const back = wp.backLink();
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/league/);
  await expect(leaderboardPage(page).heading()).toBeVisible();
});

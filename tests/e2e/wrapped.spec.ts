import { test, expect } from '@playwright/test';
import { wrappedPage } from './helpers/wrapped-page';

// Selectors live in the wrappedPage page object (helpers/wrapped-page.ts)
// and key off data-testid anchors so copy changes don't ripple here.

test('wrapped page renders a story or empty state', { tag: '@smoke' }, async ({ page }) => {
  const wp = wrappedPage(page);
  await wp.goto();

  // Dismiss the flash if it auto-opened (localStorage is empty in a fresh e2e context,
  // so the "seen" guard doesn't fire). The modal is a full-screen overlay that would
  // otherwise obscure the page content.
  await wp.dismissFlashIfOpen();

  // Either a Wrapped story renders (season data exists) or the empty state renders
  // (season not yet generated). One of them must always be visible.
  await expect(wp.storyOrEmpty()).toBeVisible();
});

test('wrapped flash modal is dismissable', async ({ page }) => {
  const wp = wrappedPage(page);
  await wp.goto();

  // If the flash opened, dismiss it and confirm it disappears.
  const flashVisible = await wp
    .flash()
    .isVisible()
    .catch(() => false);
  if (flashVisible) {
    await wp.dismissButton().click();
    await expect(wp.flash()).not.toBeVisible();
  }

  // After dismissal (or if the flash never appeared), the page content is accessible.
  await expect(wp.storyOrEmpty()).toBeVisible();
});

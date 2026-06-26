import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the How to Play guide and /how-to-play route.
 *
 * Covers WelcomeGuide.svelte (the auto-open overlay triggered on /picks for a
 * fresh user) and the standalone /how-to-play page. Every locator is keyed off
 * a stable `data-testid` anchor — copy or markup changes should not require
 * touching specs.
 *
 * The guide uses a Dialog on desktop viewports and a Sheet on mobile; both
 * carry the same `data-testid="welcome-guide"` so the selectors here work
 * regardless of viewport.
 */

export function howToPlay(page: Page) {
  const api = {
    page,

    /**
     * Navigate to /picks, where a fresh user (guide_seen_at IS NULL) sees the
     * welcome guide auto-open.
     */
    async goto() {
      await page.goto('/picks');
    },

    /** Navigate directly to the standalone /how-to-play page. */
    async gotoPage() {
      await page.goto('/how-to-play');
    },

    // --- welcome guide overlay ------------------------------------------------

    /**
     * The welcome guide overlay container (Dialog on desktop, Sheet on mobile).
     * Visible only when the guide is open.
     */
    guide(): Locator {
      return page.getByTestId('welcome-guide');
    },

    /** The primary "Got it" dismiss button inside the guide. */
    dismissButton(): Locator {
      return page.getByTestId('guide-dismiss');
    },

    // --- /how-to-play standalone page ----------------------------------------

    /** The h1 heading on the /how-to-play route. */
    pageHeading(): Locator {
      return page.getByTestId('how-to-play-heading');
    },

    // --- account menu ---------------------------------------------------------

    /** The avatar button that opens the account dropdown in the app header. */
    accountMenuTrigger(): Locator {
      return page.getByTestId('account-menu-trigger');
    },

    /** The "How to Play" item inside the account dropdown menu. */
    howToPlayMenuItem(): Locator {
      return page.getByTestId('nav-how-to-play');
    },

    // --- assertions -----------------------------------------------------------

    /** Assert the guide overlay is currently visible. */
    async expectGuideVisible() {
      await expect(api.guide()).toBeVisible();
    },

    /** Assert the guide overlay is not visible. */
    async expectGuideHidden() {
      await expect(api.guide()).not.toBeVisible();
    }
  };

  return api;
}

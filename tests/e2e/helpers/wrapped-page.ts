import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the Season Wrapped page (`/wrapped`).
 *
 * Every locator the wrapped spec depends on lives here, addressed by the stable
 * `data-testid` anchors baked into the wrapped route and its components. Copy or
 * layout changes should only require updating this file.
 */

export function wrappedPage(page: Page) {
  const api = {
    page,

    /** Navigate to /wrapped and wait for the heading to render. */
    async goto() {
      await page.goto('/wrapped');
      await expect(api.heading()).toBeVisible();
    },

    /** The main "Season Wrapped" page heading. */
    heading(): Locator {
      return page.getByRole('heading', { name: /Season Wrapped/i, level: 1 });
    },

    /**
     * A rendered story (either the player or league Wrapped). Visible when at
     * least one Wrapped row exists for the selected season.
     */
    story(): Locator {
      return page.getByTestId('wrapped-story').first();
    },

    /** The "No Wrapped yet" empty-state card shown before any Wrapped is generated. */
    empty(): Locator {
      return page.getByTestId('wrapped-empty');
    },

    /** Either the story or the empty state — one of these should always be visible. */
    storyOrEmpty(): Locator {
      return api.story().or(api.empty());
    },

    /** The once-per-season flash modal overlay. */
    flash(): Locator {
      return page.getByTestId('wrapped-flash');
    },

    /** The dismiss button inside the flash modal. */
    dismissButton(): Locator {
      return page.getByTestId('wrapped-dismiss');
    },

    /** Dismiss the flash modal if it is open. Silently skips if not visible. */
    async dismissFlashIfOpen() {
      const btn = api.dismissButton();
      await btn
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => btn.click())
        .catch(() => {
          /* no flash visible — nothing to dismiss */
        });
    },

    /** The season picker <select> (only rendered when 2+ seasons are available). */
    seasonPicker(): Locator {
      return page.getByRole('combobox', { name: 'Select season' });
    }
  };

  return api;
}

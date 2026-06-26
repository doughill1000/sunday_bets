import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the /admin add-member flow.
 *
 * Covers AddMemberCard.svelte — the member-creation form and the success
 * result box that appears after a member is added. Every locator is keyed off
 * a stable `data-testid` anchor so copy or markup changes do not require
 * touching specs.
 *
 * Note: `result()` is conditionally rendered (only when `lastResult` is set
 * after a successful add-member API call). Use `expectResultVisible()` rather
 * than asserting visibility inline so the built-in timeout applies.
 */

export function adminMembers(page: Page) {
  const api = {
    page,

    /** Navigate to /admin and wait for the add-member card to be visible. */
    async goto() {
      await page.goto('/admin');
      await expect(api.card()).toBeVisible();
    },

    // --- add-member card ------------------------------------------------------

    /** The wrapper element for the add-member card. */
    card(): Locator {
      return page.getByTestId('add-member-card');
    },

    /** The email address input field. */
    emailInput(): Locator {
      return page.getByTestId('add-member-email');
    },

    /** The display name input field. */
    displayNameInput(): Locator {
      return page.getByTestId('add-member-display-name');
    },

    /** The password input field (leave empty to auto-generate). */
    passwordInput(): Locator {
      return page.getByTestId('add-member-password');
    },

    /** The "Add Member" submit button. */
    submitButton(): Locator {
      return page.getByTestId('add-member-submit');
    },

    /**
     * The success result box shown after a member is added.
     * Conditionally rendered — only present when `lastResult` is set.
     */
    result(): Locator {
      return page.getByTestId('add-member-result');
    },

    // --- assertions -----------------------------------------------------------

    /** Assert the success result box is visible (waits up to 10 s). */
    async expectResultVisible() {
      await expect(api.result()).toBeVisible({ timeout: 15000 });
    }
  };

  return api;
}

import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the auth pages (`/auth` and `/auth/reset`).
 *
 * Every locator the auth specs depend on lives here, addressed by the stable
 * `data-testid` anchors baked into the auth components (see the testid
 * convention in `docs/agent-context/testing.md`). When UI copy or layout
 * changes, the fix lands in this one file instead of cascading across specs.
 *
 * `input[name="email"]` / `input[name="password"]` are kept as-is — they are
 * stable form contracts (the `name` attribute is load-bearing for the server
 * action), not copy-based chrome.
 */

export function authPage(page: Page) {
  const api = {
    page,

    /** Navigate to /auth and wait for the email input to appear. */
    async goto() {
      await page.goto('/auth');
      await expect(api.emailInput()).toBeVisible();
    },

    // --- auth card (/auth) ---

    /** The card title; its text reflects the current mode (signin/signup/resetRequest). */
    cardTitle(): Locator {
      return page.getByTestId('auth-card-title');
    },

    /** The card description line beneath the title. */
    description(): Locator {
      return page.getByTestId('auth-description');
    },

    /** The email input — stable `name` contract, not chrome. */
    emailInput(): Locator {
      return page.locator('input[name="email"]');
    },

    /** The password input — stable `name` contract, not chrome. */
    passwordInput(): Locator {
      return page.locator('input[name="password"]');
    },

    /** The primary submit button on the main auth form. */
    submitButton(): Locator {
      return page.getByTestId('auth-submit');
    },

    /**
     * The "Create an account" mode-switch button in the card footer.
     * Only present when mode === 'signin'.
     */
    switchToSignUp(): Locator {
      return page.getByTestId('auth-switch-signup');
    },

    // --- post-signup "check your email" screen (/auth) ---

    /** The "Check your email" heading shown after a successful sign-up. */
    checkEmailTitle(): Locator {
      return page.getByTestId('auth-check-email-title');
    },

    /** The resend-confirmation-email button on the check-email screen. */
    resendButton(): Locator {
      return page.getByTestId('auth-resend-submit');
    },

    /** The "Back to sign in" button on the check-email screen. */
    backToSignInButton(): Locator {
      return page.getByTestId('auth-back-to-signin');
    },

    // --- reset page (/auth/reset) ---

    /** The card title on /auth/reset. */
    resetCardTitle(): Locator {
      return page.getByTestId('reset-card-title');
    },

    /** The submit button on /auth/reset. */
    resetSubmitButton(): Locator {
      return page.getByTestId('reset-submit');
    },

    /** The confirmation heading shown after a successful password update. */
    resetSuccessTitle(): Locator {
      return page.getByTestId('reset-success-title');
    },

    // --- assertions ---

    /** Assert the auth card title text matches the expected mode heading. */
    async expectTitle(text: string) {
      await expect(api.cardTitle()).toHaveText(text);
    },

    /** Assert the reset-page card title text. */
    async expectResetTitle(text: string) {
      await expect(api.resetCardTitle()).toHaveText(text);
    }
  };

  return api;
}

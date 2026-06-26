import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the join flow (`/join`, `/join/pending`, `/join/[code]`).
 *
 * Every locator the join-related specs depend on lives here, addressed by the
 * stable `data-testid` anchors baked into the join components (see the testid
 * convention in `docs/agent-context/testing.md`).  When UI copy or markup
 * changes, the fix lands in this one file instead of cascading across specs.
 *
 * Used by:
 *   - `tests/e2e/self-signup.spec.ts` — membership-state routing (navigation helpers)
 *   - `tests/e2e/join-invite.spec.ts` — invite redemption (locators + assertions)
 *
 * Note: each status-specific view (`invite-*-view`) only renders in the DOM when
 * `data.status` matches that branch in `/join/[code]/+page.svelte`.  The join
 * button (`invite-join-button`) is likewise only present for `status === 'valid'`.
 */

export function joinPage(page: Page) {
  const api = {
    page,

    // --- navigation -----------------------------------------------------------

    /** Navigate to the /join landing page (no-membership state). */
    async goto() {
      await page.goto('/join');
    },

    /** Navigate to /join/pending (pending-membership holding page). */
    async gotoPending() {
      await page.goto('/join/pending');
    },

    /** Navigate to the invite-redemption page for the given code. */
    async gotoInvite(code: string) {
      await page.goto(`/join/${code}`);
    },

    // --- /join/[code] state views ---------------------------------------------
    // Each locator corresponds to one mutually-exclusive branch of the
    // `{#if data.status === ...}` block in `/join/[code]/+page.svelte`.

    /**
     * The info block shown when the invite is valid and ready to accept.
     * Present only when `data.status === 'valid'`.
     */
    inviteValidView(): Locator {
      return page.getByTestId('invite-valid-view');
    },

    /**
     * The submit button that creates the membership row.
     * Present only when `data.status === 'valid'`.
     */
    joinButton(): Locator {
      return page.getByTestId('invite-join-button');
    },

    /**
     * The error block shown when the invite code is not found.
     * Present only when `data.status === 'invalid'`.
     */
    inviteInvalidView(): Locator {
      return page.getByTestId('invite-invalid-view');
    },

    /**
     * The error block shown when the invite has been revoked.
     * Present only when `data.status === 'revoked'`.
     */
    inviteRevokedView(): Locator {
      return page.getByTestId('invite-revoked-view');
    },

    /**
     * The error block shown when the invite has expired.
     * Present only when `data.status === 'expired'`.
     */
    inviteExpiredView(): Locator {
      return page.getByTestId('invite-expired-view');
    },

    /**
     * The error block shown when the invite has been fully used.
     * Present only when `data.status === 'exhausted'`.
     */
    inviteExhaustedView(): Locator {
      return page.getByTestId('invite-exhausted-view');
    },

    // --- assertions -----------------------------------------------------------

    /** Assert the join button is visible (invite is valid and actionable). */
    async expectJoinButtonVisible(timeout = 10000) {
      await expect(api.joinButton()).toBeVisible({ timeout });
    },

    /** Assert the join button is not in the DOM (terminal/error invite state). */
    async expectJoinButtonNotVisible() {
      await expect(api.joinButton()).not.toBeVisible();
    },

    /** Assert the expired-invite error block is visible. */
    async expectExpiredVisible(timeout = 10000) {
      await expect(api.inviteExpiredView()).toBeVisible({ timeout });
    },

    /** Assert the revoked-invite error block is visible. */
    async expectRevokedVisible(timeout = 10000) {
      await expect(api.inviteRevokedView()).toBeVisible({ timeout });
    },

    /** Assert the not-found error block is visible. */
    async expectInvalidVisible(timeout = 10000) {
      await expect(api.inviteInvalidView()).toBeVisible({ timeout });
    }
  };

  return api;
}

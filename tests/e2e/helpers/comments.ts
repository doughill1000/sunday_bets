import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the CommentsSection (`/picks`, inside a started game row).
 *
 * Every locator the comments specs depend on lives here, addressed by the stable
 * `data-testid` anchors baked into CommentsSection.svelte (see the testid
 * convention in `docs/agent-context/testing.md`). When UI copy or markup
 * changes, the fix lands in this one file instead of cascading across specs.
 *
 * The comment body text a test types and posts is real fixture data — asserting
 * on it with `getByText` is intentional and kept in `expectCommentVisible`.
 */

export function commentsSection(page: Page) {
  const api = {
    page,

    /** Navigate to /picks. */
    async goto() {
      await page.goto('/picks');
    },

    /**
     * Open the committed-games disclosure panel that wraps CommentsSection.
     * Uses the existing `committed-section` testid on LockedPicksSection's
     * `<details>` element so structural navigation stays inside page objects.
     */
    async openStartedGame() {
      const details = page.getByTestId('committed-section');
      await expect(details).toBeVisible();
      const isOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!isOpen) await details.locator('summary').click();
    },

    /**
     * The CommentsSection root element for the first started game.
     * Only present when `started && social[g.id]` is truthy for a game
     * (i.e. the game has kicked off and social data exists).
     */
    section(): Locator {
      return page.getByTestId('comments-section').first();
    },

    /**
     * The comment text input (composer).
     * Always rendered once CommentsSection mounts.
     */
    commentInput(): Locator {
      return api.section().getByTestId('comment-composer');
    },

    /**
     * The submit ("Post") button for the comment form.
     * Always rendered once CommentsSection mounts.
     */
    submitButton(): Locator {
      return api.section().getByTestId('comment-submit');
    },

    /**
     * A comment row in the posted-comments list (default: first).
     * Only present after at least one comment exists (`comments.length > 0`).
     */
    commentRow(index = 0): Locator {
      return api.section().getByTestId('comment-row').nth(index);
    },

    /**
     * The comment row whose body matches `body` — the row a test just posted.
     * Scoping reaction locators to this row keeps them unambiguous when several
     * comments are present.
     */
    rowWithText(body: string): Locator {
      return api.section().getByTestId('comment-row').filter({ hasText: body });
    },

    // --- reactions (tapbacks, #689) -------------------------------------------

    /** The compact "＋" button that opens a row's frozen 5-emoji picker. */
    reactionAdd(row: Locator): Locator {
      return row.getByTestId('reaction-add');
    },

    /** An emoji button inside an open picker (by slug, e.g. "fire"). */
    reactionPick(row: Locator, slug: string): Locator {
      return row.getByTestId(`reaction-pick-${slug}`);
    },

    /** A rendered tapback chip (only present for an emoji with ≥1 reaction). */
    reactionChip(row: Locator, slug: string): Locator {
      return row.getByTestId(`reaction-chip-${slug}`);
    },

    /** The revealed reactor-names line (present only after tapping a chip). */
    reactionReactors(row: Locator): Locator {
      return row.getByTestId('reaction-reactors');
    },

    // --- assertions -----------------------------------------------------------

    /** Assert that CommentsSection has rendered (composer is visible). */
    async expectVisible(timeout = 5000) {
      await expect(api.commentInput()).toBeVisible({ timeout });
    },

    /**
     * Assert that a comment body appears in the list.
     * `body` is the exact string the test typed — real data, not chrome.
     */
    async expectCommentVisible(body: string, timeout = 3000) {
      await expect(page.getByText(body)).toBeVisible({ timeout });
    }
  };

  return api;
}

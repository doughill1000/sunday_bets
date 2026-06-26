import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the leaderboard (`/leaderboard`).
 *
 * Every locator the leaderboard spec depends on lives here, addressed by the
 * stable `data-testid` anchors baked into the leaderboard route (see the testid
 * convention in `docs/agent-context/testing.md`). Tab labels and table headers
 * are UI copy, so the spec keys off testids instead of role/text — a heading or
 * column-label change should not require touching the spec.
 */

export function leaderboardPage(page: Page) {
  const api = {
    page,

    /** Navigate to the leaderboard and wait for the heading to render. */
    async goto() {
      await page.goto('/leaderboard');
      await expect(api.heading()).toBeVisible();
    },

    /** The page heading. */
    heading(): Locator {
      return page.getByTestId('leaderboard-heading');
    },

    // --- tabs ----------------------------------------------------------------

    standingsTab(): Locator {
      return page.getByTestId('leaderboard-tab-standings');
    },

    weeklyTab(): Locator {
      return page.getByTestId('leaderboard-tab-weekly');
    },

    // --- standings panel -----------------------------------------------------

    /** The standings results table (present only when standings exist). */
    standingsTable(): Locator {
      return page.getByTestId('standings-table');
    },

    /** The "No standings yet" empty-state card (present only when there are none). */
    standingsEmpty(): Locator {
      return page.getByTestId('standings-empty');
    },

    // --- weekly panel --------------------------------------------------------

    /**
     * The weekly breakdown content (week navigator + cards/empty state). Only
     * mounts after the Weekly tab triggers its `?view=weekly` navigation, so
     * use `openWeekly()` to switch and wait for it.
     */
    weeklyBreakdown(): Locator {
      return page.getByTestId('weekly-breakdown');
    },

    /**
     * Click the Weekly tab and wait for its content to load. The click is
     * retried because switching tabs kicks off an async navigation that
     * replaces the "Loading…" placeholder with the breakdown.
     */
    async openWeekly() {
      await expect(async () => {
        await api.weeklyTab().click();
        await expect(api.weeklyBreakdown()).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 8000 });
    }
  };

  return api;
}

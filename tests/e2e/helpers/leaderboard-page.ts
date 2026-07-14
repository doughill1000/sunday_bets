import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the League home standings (`/league`, the merged Leaderboard+Group tab, #561).
 *
 * Every locator the standings specs depend on lives here, addressed by the stable `data-testid`
 * anchors baked into the route (see the testid convention in `docs/agent-context/testing.md`).
 * Those anchors keep their `leaderboard-` prefix even though the route is now `/league` — the
 * content is still the leaderboard, so the anchors stay put across the rename. Tab labels and
 * table headers are UI copy, so the spec keys off testids instead of role/text — a heading or
 * column-label change should not require touching the spec.
 *
 * By that same rule the second tab keeps its `leaderboard-tab-weekly` anchor and `weeklyTab()`
 * accessor even though #631 relabelled it "Week" — the anchor outlives the copy. What #631 did
 * change is structural, and that IS asserted: each tab owns exactly one context control rendered
 * inside its own panel (Standings the season/All-time select, Week the week navigator), and no
 * panel content renders outside the tab group.
 */

export function leaderboardPage(page: Page) {
  const api = {
    page,

    /** Navigate to the League home and wait for the standings heading to render. */
    async goto() {
      await page.goto('/league');
      await expect(api.heading()).toBeVisible();
      // Dismiss the AI recap flash modal if it auto-opened (localStorage is empty
      // in a fresh e2e context, so the "seen" guard doesn't fire). The modal is a
      // full-screen overlay that blocks all tab interactions until dismissed.
      const dismiss = page.getByTestId('recap-flash').getByRole('button', { name: 'Close' });
      await dismiss
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => dismiss.click())
        .catch(() => {
          /* no recap visible — nothing to dismiss */
        });
    },

    /** The page heading. */
    heading(): Locator {
      return page.getByTestId('leaderboard-heading');
    },

    // --- tabs ----------------------------------------------------------------

    standingsTab(): Locator {
      return page.getByTestId('leaderboard-tab-standings');
    },

    /** The second tab — labelled "Week" since #631; the anchor keeps its older spelling. */
    weeklyTab(): Locator {
      return page.getByTestId('leaderboard-tab-weekly');
    },

    /** The League honors case. Renders only inside the Standings panel (#631), and only once
     *  the league has a champion or awarded badges — so it is absent from the e2e fixture,
     *  whose single seeded game never grades. */
    honors(): Locator {
      return page.getByTestId('league-honors');
    },

    /** The "Manage" heading action — the door to /league/manage since #631 lifted it out of
     *  the full-width card that used to render under both tabs. */
    manageEntry(): Locator {
      return page.getByTestId('manage-entry');
    },

    /** The subtitle line under the heading — swaps between "<year> season." and the
     *  All-time copy depending on the selected scope. */
    subtitle(): Locator {
      return page.getByTestId('leaderboard-subtitle');
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
    },

    // --- all-time window (folded into the scope dropdown, #546) ----------------

    /** The all-time results table (shown when the All-time scope is selected and career
     *  totals exist). */
    allTimeTable(): Locator {
      return page.getByTestId('alltime-table');
    },

    /** The "No all-time standings yet" empty-state card. */
    allTimeEmpty(): Locator {
      return page.getByTestId('alltime-empty');
    },

    /** Select the pinned "All-time" option from the scope dropdown and wait for the
     *  career standings (or their empty state) to render on the Standings panel. */
    async selectAllTime() {
      await api.scopeSelect().selectOption('alltime');
      await expect(api.allTimeTable().or(api.allTimeEmpty())).toBeVisible({ timeout: 5000 });
    },

    /** Select a specific scope-dropdown option by its `<option>` value (a season year
     *  string, or the `alltime` sentinel). */
    async selectScope(value: string) {
      await api.scopeSelect().selectOption(value);
    },

    // --- scope dropdown ------------------------------------------------------

    /** The season/scope <select> — seasons plus the pinned "All-time" option (#546). */
    scopeSelect(): Locator {
      return page.getByTestId('leaderboard-scope');
    },

    // --- week navigator ------------------------------------------------------

    /** The Week tab's one context control, lifted above the week's hardware in #631. */
    weekNavigator(): Locator {
      return page.getByTestId('week-navigator');
    },

    /** The "Jump to week" dropdown trigger button. */
    weekDropdownTrigger(): Locator {
      return page.getByRole('button', { name: 'Jump to week' });
    },

    /** Click the week dropdown and wait for its content to open. */
    async openWeekDropdown() {
      await api.weekDropdownTrigger().click();
      // Wait for at least one dropdown item to appear.
      await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 });
    }
  };

  return api;
}

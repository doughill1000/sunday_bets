import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the Week destination (`/week`, promoted out of /league's third tab by #776).
 *
 * The content anchors moved here with the panel and keep their old spellings — `weekly-breakdown`,
 * `week-scope-bar`, `week-navigator` are stable e2e anchors that outlive the address change, same
 * rule as the `leaderboard-` prefixes on /league (see leaderboard-page.ts).
 */
export function weekPage(page: Page) {
  const api = {
    page,

    /** Navigate to /week (optionally to a specific week) and wait for the heading. */
    async goto(opts: { week?: number; season?: number } = {}) {
      const params = new URLSearchParams();
      if (opts.season) params.set('season', String(opts.season));
      if (opts.week) params.set('week', String(opts.week));
      const qs = params.toString();
      await page.goto(qs ? `/week?${qs}` : '/week');
      await expect(api.heading()).toBeVisible();
      // Dismiss the season-story flash if it auto-opened (fresh e2e contexts have no seen
      // marker) — it is a full-screen overlay that blocks interactions until dismissed.
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
      return page.getByTestId('week-heading');
    },

    /** The subtitle line — "<year> season · Week N." */
    subtitle(): Locator {
      return page.getByTestId('week-subtitle');
    },

    /** The weekly breakdown content (cards/empty state). */
    weeklyBreakdown(): Locator {
      return page.getByTestId('weekly-breakdown');
    },

    /** The page's one context control (#631): the week picker in the sticky scope bar. */
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

import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the picks board (`/picks`).
 *
 * Every locator the picks specs depend on lives here, addressed by the stable
 * `data-testid` anchors baked into the picks components (see the testid
 * convention in `docs/agent-context/testing.md`). When UI copy or markup
 * changes, the fix lands in this one file instead of cascading across specs.
 *
 * Team buttons stay keyed by their abbreviation (e.g. `KC`, `BUF`) because that
 * is real fixture data, not chrome — asserting on it is intentional.
 */

const WEIGHT_CODE = { Low: 'L', Medium: 'M', High: 'H', 'All-In': 'A' } as const;
export type WeightName = keyof typeof WEIGHT_CODE;

export function picksBoard(page: Page) {
  const api = {
    page,

    /** Navigate to the board and wait for the first card to hydrate. */
    async goto() {
      await page.goto('/picks');
      await expect(api.card()).toBeVisible();
      // The board disables its pick controls until it mounts client-side, so an
      // early interaction can't be silently dropped before hydration wires up the
      // handlers. Waiting for the first team button to become enabled guarantees
      // the board is interactive before any spec taps a team/weight/clear control.
      await expect(api.teamSelect().getByRole('button').first()).toBeEnabled();
    },

    // --- open board ---------------------------------------------------------

    /** A game card on the open board (default: the first/only seeded game). */
    card(index = 0): Locator {
      return page.getByTestId('game-card').nth(index);
    },

    /** The "Pick a team" group inside a card. */
    teamSelect(index = 0): Locator {
      return api.card(index).getByTestId('team-select');
    },

    /** A team button by abbreviation — real fixture data, not chrome copy. */
    team(abbr: string, index = 0): Locator {
      return api.teamSelect(index).getByRole('button', { name: abbr });
    },

    /** A weight chip addressed by its human name, resolved to the stable code. */
    weight(name: WeightName, index = 0): Locator {
      return api.card(index).getByTestId(`weight-item-${WEIGHT_CODE[name]}`);
    },

    /** The "Lock in" button that persists a fully-staged pick. */
    lockIn(index = 0): Locator {
      return api.card(index).getByTestId('lock-in');
    },

    /** The "Clear pick" control on a staged card. */
    clear(index = 0): Locator {
      return api.card(index).getByTestId('clear-pick');
    },

    /** The inline All-In confirm button (only present after tapping All-In). */
    allInConfirm(index = 0): Locator {
      return api.card(index).getByTestId('all-in-confirm');
    },

    /** The inline All-In cancel button. */
    allInCancel(index = 0): Locator {
      return api.card(index).getByTestId('all-in-cancel');
    },

    // --- summary bar --------------------------------------------------------

    /** The "{saved}/{total} saved" counter span. */
    savedCounter(): Locator {
      return page.getByTestId('saved-counter');
    },

    /** The "· N to pick" still-open indicator in the summary bar. */
    openCount(): Locator {
      return page.getByTestId('open-count');
    },

    /** The week's All-In status line in the summary bar. */
    allInSummary(): Locator {
      return page.getByTestId('all-in-summary');
    },

    // --- committed section --------------------------------------------------

    /** The "N committed pick(s)" disclosure summary. */
    committedSummary(): Locator {
      return page.getByTestId('committed-summary');
    },

    /** A committed pick row (default: the first). */
    committedRow(index = 0): Locator {
      return page.getByTestId('committed-row').nth(index);
    },

    /** The "🔓 Unlock" control that returns a committed pick to the board. */
    unlock(index = 0): Locator {
      return api.committedRow(index).getByTestId('unlock-pick');
    },

    // --- assertions ---------------------------------------------------------

    /** Assert the saved/total counter, e.g. `expectSaved(1, 1)` → "1/1 saved". */
    async expectSaved(saved: number, total: number) {
      await expect(api.savedCounter()).toHaveText(`${saved}/${total} saved`);
    },

    /** Assert a team button's selected (aria-pressed) state. */
    async expectTeamPressed(abbr: string, pressed: boolean, index = 0) {
      await expect(api.team(abbr, index)).toHaveAttribute('aria-pressed', String(pressed));
    }
  };

  return api;
}

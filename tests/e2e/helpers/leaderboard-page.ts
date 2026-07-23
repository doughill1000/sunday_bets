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
 * Two tabs since #776 promoted Week to its own top-level destination (see week-page.ts for that
 * page's object): Standings and Honors. What #631 changed is structural, and that IS asserted:
 * each tab owns exactly one context control rendered inside its own panel (Standings the
 * season/All-time select, Honors its season select since #741), and no panel content renders
 * outside the tab group.
 */

export function leaderboardPage(page: Page) {
  const api = {
    page,

    /** Navigate to the League home and wait for the standings heading to render. Pass
     *  `season` to pin the scope — without it the page shows the newest season the league has
     *  standings for, which differs between CI's clean DB and a prod-cloned local one. Any
     *  spec asserting on a seeded row should pin it. Pass `scope: 'alltime'` to deep-link the
     *  career window (#737 — `?scope=alltime` is the shareable All-time URL). */
    async goto(opts: { season?: number; scope?: 'alltime' } = {}) {
      const params = new URLSearchParams();
      if (opts.season) params.set('season', String(opts.season));
      if (opts.scope) params.set('scope', opts.scope);
      const qs = params.toString();
      await page.goto(qs ? `/league?${qs}` : '/league');
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

    /** The Honors tab — the trophy room (#741). */
    honorsTab(): Locator {
      return page.getByTestId('leaderboard-tab-honors');
    },

    /** The League honors case. Renders only inside the Honors panel (#741; Standings-only
     *  before that), and only once the league has a champion or awarded badges — so it is
     *  absent from the e2e fixture, whose single seeded game never grades. */
    honors(): Locator {
      return page.getByTestId('league-honors');
    },

    /** The Honors tab's hero (#741): the viewed season's champion, or its designed
     *  "not decided yet" zero-state — it ALWAYS renders inside the Honors panel, which makes
     *  it the tab's deterministic anchor across fixture states (the e2e fixture never grades
     *  a week, so it shows the zero-state there). */
    championCard(): Locator {
      return page.getByTestId('champion-card');
    },

    /** The one-line honors door above the tab group (#741) — renders only once the league
     *  has a reigning champion, so it is absent from the e2e fixture. */
    honorsStrip(): Locator {
      return page.getByTestId('honors-strip');
    },

    /** Click the Honors tab and wait for the trophy room to render. A pure client flip (no
     *  navigation), but the click can land before hydration wires the tab up — retry. */
    async openHonors() {
      await expect(async () => {
        await api.honorsTab().click();
        await expect(api.championCard()).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 8000 });
    },

    /** The "Manage" heading action — the door to /league/manage since #631 lifted it out of
     *  the full-width card that used to render under both tabs. Renders for commissioners
     *  only since #660, so a member fixture will find nothing here. */
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

    /** A single standings row, addressed by the player name rendered in it. Keyed off text
     *  rather than a testid because the row has no per-player anchor — the name IS how a
     *  reader finds their row. The `Commissioner` marker (#660) renders inside this row, on
     *  its own muted line beneath the record.
     *
     *  Matched EXACTLY, not by substring: the fixture's names nest ("e2e" is a prefix of
     *  "e2e-multigroup"), so a substring match would resolve to both rows and quietly assert
     *  against the wrong one. Pass the name as rendered — a viewer's own row reads
     *  "<name> (you)". */
    standingsRow(displayName: string): Locator {
      return api
        .standingsTable()
        .getByRole('row')
        .filter({ has: page.getByText(displayName, { exact: true }) });
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

    /** The credibility ladder card (#637/#737). Renders under BOTH scopes, but only once a
     *  member has a rating — the e2e fixture never settles enough decisions, so specs assert
     *  its absence (the no-empty-ladder rule, ADR-0032 §5) rather than its rows. */
    ratingLadder(): Locator {
      return page.getByTestId('rating-ladder');
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

    /** The Honors tab's one control (#741): a season select with no All-time pin — honors
     *  are season-grain, so the room never offers a window it can't render. */
    honorsSeasonSelect(): Locator {
      return page.getByTestId('honors-season');
    },

    /** The week navigator — MUST stay hidden here: it moved to /week with its panel (#776).
     *  Kept as an accessor so the containment spec can assert its absence. */
    weekNavigator(): Locator {
      return page.getByTestId('week-navigator');
    }
  };

  return api;
}

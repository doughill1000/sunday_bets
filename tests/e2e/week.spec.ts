import { test, expect } from '@playwright/test';
import { weekPage } from './helpers/week-page';
import { SEASON_YEAR } from './global-setup';

// The Week destination (#776): /league's old third tab promoted to its own top-level nav slot.
// The panel's internals are unchanged from #631/#741 — week picker, hardware + legend, the
// user-scoped pick breakdown — so these specs assert the surface serves at its new address and
// that the shareable-URL contract (`/league?view=weekly[&week=N]`) forwards into it.

test(
  '/week renders the week picker and the weekly breakdown',
  { tag: '@smoke' },
  async ({ page }) => {
    const wk = weekPage(page);
    await wk.goto();

    await expect(wk.weekNavigator()).toBeVisible();
    await expect(wk.weeklyBreakdown()).toBeVisible();
    // A bare /week opens on the season in play (#824) — the seed's active week belongs to
    // SEASON_YEAR, so that is the season the tab must land on with no `?season=` at all. It
    // used to open on the newest season with graded standings, which all preseason is the
    // season BEFORE the one people are playing (ADR-0016 keeps non-scoring rounds out of
    // every aggregation, so the live season has no standings to be newest by).
    await expect(wk.subtitle()).toHaveText(new RegExp(`^${SEASON_YEAR} season · `));
  }
);

test('the week picker offers a jump-to-week dropdown', async ({ page }) => {
  // Pin the seeded season explicitly — the dropdown's contents are what this spec is about,
  // so it should not depend on the default resolving to the same year (asserted above).
  const wk = weekPage(page);
  await wk.goto({ season: SEASON_YEAR });

  // The week dropdown trigger is always present once the breakdown loads.
  await expect(wk.weekDropdownTrigger()).toBeVisible();

  // Opening the dropdown reveals at least one week option.
  await wk.openWeekDropdown();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
});

test('the old /league?view=weekly contract forwards to /week', async ({ page }) => {
  // `?view=weekly` was the shareable URL of the old third tab — bookmarks and shared links must
  // land on the same content at its new address (hooks 308), with `week` preserved.
  await page.goto('/league?view=weekly');
  await expect(page).toHaveURL(/\/week$/);
  await expect(weekPage(page).weeklyBreakdown()).toBeVisible();

  await page.goto('/league?view=weekly&week=1');
  await expect(page).toHaveURL(/\/week\?week=1$/);
});

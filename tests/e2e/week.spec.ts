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
    await expect(wk.subtitle()).toHaveText(/^\d{4} season · /);
  }
);

test('the week picker offers a jump-to-week dropdown', async ({ page }) => {
  // Pin the seeded season: without it the page defaults to the newest season the DB knows,
  // which on a prod-cloned local DB can be a schedule-less year whose dropdown is empty.
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

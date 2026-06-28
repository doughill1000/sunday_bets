import { test, expect } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';

// Selectors live in the leaderboardPage page object (helpers/leaderboard-page.ts)
// and key off data-testid anchors, so tab/column copy changes don't ripple here.

test('leaderboard renders Standings and Weekly tabs', { tag: '@smoke' }, async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();

  // Both tabs are present.
  await expect(lb.standingsTab()).toBeVisible();
  await expect(lb.weeklyTab()).toBeVisible();

  // Standings is the default tab: the results table or the empty state renders.
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();

  // Switching to Weekly loads the weekly breakdown (handles the async navigation).
  await lb.openWeekly();
  await expect(lb.weeklyBreakdown()).toBeVisible();
});

test('weekly tab shows a jump-to-week dropdown', async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();
  await lb.openWeekly();

  // The week dropdown trigger is always present once the weekly breakdown loads.
  await expect(lb.weekDropdownTrigger()).toBeVisible();

  // Opening the dropdown reveals at least one week option.
  await lb.openWeekDropdown();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
});

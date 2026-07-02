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

test('all-time tab renders career standings and hides the season picker', async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();

  const standingsSubtitle = await lb.subtitle().textContent();
  const seasonPickerVisibleBefore = (await lb.seasonPicker().count()) > 0;

  await lb.allTimeTab().click();
  await expect(lb.allTimeTable().or(lb.allTimeEmpty())).toBeVisible();
  await expect(lb.subtitle()).toHaveText('All-time · every season combined.');
  await expect(lb.seasonPicker()).toBeHidden();

  // Switching back to Standings restores the same season (the subtitle text, which
  // encodes the season year, is unchanged from before the All-time tab was opened).
  await lb.standingsTab().click();
  await expect(lb.subtitle()).toHaveText(standingsSubtitle ?? '');
  if (seasonPickerVisibleBefore) {
    await expect(lb.seasonPicker()).toBeVisible();
  }
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

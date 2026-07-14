import { test, expect } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';

// Selectors live in the leaderboardPage page object (helpers/leaderboard-page.ts)
// and key off data-testid anchors, so tab/column copy changes don't ripple here.

test('leaderboard renders Standings and Week tabs', { tag: '@smoke' }, async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();

  // Exactly two tabs, labelled "Standings" and "Week" (#631 renamed Weekly → Week: it shows one
  // selected week, not a trend). Copy is asserted here — and only here — because the tab labels
  // ARE the IA claim; every other locator keys off a testid.
  await expect(lb.standingsTab()).toBeVisible();
  await expect(lb.weeklyTab()).toBeVisible();
  await expect(lb.standingsTab()).toHaveText('Standings');
  await expect(lb.weeklyTab()).toHaveText('Week');

  // Standings is the default tab: the results table or the empty state renders.
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();

  // Switching to Week loads the weekly breakdown (handles the async navigation).
  await lb.openWeekly();
  await expect(lb.weeklyBreakdown()).toBeVisible();
});

test('each tab owns exactly one context control, contained in its own panel', async ({ page }) => {
  // #631's core claim: the tab you're on governs what's on screen. Before it, the season
  // selector and honors rendered OUTSIDE </Tabs>, so both showed under both tabs — and the
  // global bar offered All-time above Week, which has no all-time view and bounced you back.
  const lb = leaderboardPage(page);
  await lb.goto();

  // Standings owns the season/All-time select — and there is exactly ONE of it on the page.
  // The honors card used to render a second SeasonPicker of its own; #631 deleted it.
  await expect(lb.scopeSelect()).toBeVisible();
  await expect(lb.scopeSelect()).toHaveCount(1);
  await expect(lb.weekNavigator()).toBeHidden();

  // Week owns the week picker, and the season/All-time select is gone with the panel it lives
  // in — so All-time is now unreachable from Week rather than reachable-then-rescinded.
  await lb.openWeekly();
  await expect(lb.weekNavigator()).toBeVisible();
  await expect(lb.scopeSelect()).toBeHidden();
  // Honors is Standings-only. (The e2e fixture never grades a week, so honors has nothing to
  // render either way — the load-bearing containment check is the selector above; honors under
  // a graded season is covered by the demo-seeded manual pass.)
  await expect(lb.honors()).toBeHidden();
});

test('Members & manage is reachable from the League heading action', async ({ page }) => {
  // #631 lifted this out of a full-width card that rendered after </Tabs> — i.e. under both
  // tabs — into a heading action, leaving nothing outside the tab group.
  const lb = leaderboardPage(page);
  await lb.goto();

  await expect(lb.manageEntry()).toBeVisible();
  await lb.manageEntry().click();
  await expect(page).toHaveURL(/\/league\/manage/);
  await expect(page.getByTestId('manage-back')).toBeVisible();
});

test('All-time is a pinned scope option that renders career standings', async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();

  const seasonValue = await lb.scopeSelect().inputValue();
  const standingsSubtitle = await lb.subtitle().textContent();

  // All-time folded into the season dropdown (#546): it is one scope option, not a tab.
  await lb.selectAllTime();
  await expect(lb.subtitle()).toHaveText('All-time · every season combined.');
  // The Standings panel now hosts the career table (All-time is a standings window).
  await expect(lb.standingsTab()).toBeVisible();

  // Selecting the same season again restores the season standings + subtitle.
  await lb.selectScope(seasonValue);
  await expect(lb.subtitle()).toHaveText(standingsSubtitle ?? '');
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
});

test('week tab shows a jump-to-week dropdown', async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();
  await lb.openWeekly();

  // The week dropdown trigger is always present once the weekly breakdown loads.
  await expect(lb.weekDropdownTrigger()).toBeVisible();

  // Opening the dropdown reveals at least one week option.
  await lb.openWeekDropdown();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
});

test('the Season recaps archive has a door and a way back', async ({ page }) => {
  // /recap rendered the shelf + hardware + AI recaps for two releases while the authed nav
  // linked to it nowhere — reachable only via the RecapFlash toast (#631 symptom 04). It is
  // now a CTA-reached archive, so it must at least serve and offer a way back.
  await page.goto('/recap');

  await expect(page.getByRole('heading', { name: 'Season recaps' })).toBeVisible();

  const back = page.getByTestId('recaps-back');
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/league/);
  await expect(leaderboardPage(page).heading()).toBeVisible();
});

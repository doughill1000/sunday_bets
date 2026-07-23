import { test, expect } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';

// Selectors live in the leaderboardPage page object (helpers/leaderboard-page.ts)
// and key off data-testid anchors, so tab/column copy changes don't ripple here.

test('leaderboard renders Standings and Honors tabs', { tag: '@smoke' }, async ({ page }) => {
  const lb = leaderboardPage(page);
  await lb.goto();

  // Exactly two tabs, labelled "Standings" and "Honors" (#741 — the trophy room): #776 promoted
  // Week to its own top-level nav destination, returning /league to two lanes. Copy is asserted
  // here — and only here — because the tab labels ARE the IA claim; every other locator keys
  // off a testid.
  await expect(lb.standingsTab()).toBeVisible();
  await expect(lb.honorsTab()).toBeVisible();
  await expect(lb.standingsTab()).toHaveText('Standings');
  await expect(lb.honorsTab()).toHaveText('Honors');
  await expect(page.getByRole('tab')).toHaveCount(2);

  // Standings is the unconditional default tab — year-round, live window included now that
  // #584's auto-flip retired with #776 (Honors is one tap away, never a computed default):
  // the results table or the empty state renders.
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
});

test('each tab owns exactly one context control, contained in its own panel', async ({ page }) => {
  // #631's core claim, back to two tabs since #776 moved Week out: the tab you're on governs
  // what's on screen. Before #631, the season selector and honors rendered OUTSIDE </Tabs>,
  // so both showed under both tabs.
  const lb = leaderboardPage(page);
  await lb.goto();

  // Standings owns the season/All-time select — and there is exactly ONE of it on the page.
  // The honors card used to render a second SeasonPicker of its own; #631 deleted it. The
  // week navigator left for /week with its panel (#776), so it must be absent everywhere here.
  await expect(lb.scopeSelect()).toBeVisible();
  await expect(lb.scopeSelect()).toHaveCount(1);
  await expect(lb.weekNavigator()).toHaveCount(0);
  await expect(lb.honorsSeasonSelect()).toBeHidden();

  // Honors owns its own season select (no All-time pin — honors are season-grain), and the
  // other tab's control is gone with its panel. The champion card is the panel's
  // deterministic anchor: it renders its "not decided yet" zero-state even on the e2e
  // fixture, which never grades a week (#741's designed empty state).
  await lb.openHonors();
  await expect(lb.honorsSeasonSelect()).toBeVisible();
  await expect(lb.honorsSeasonSelect()).toHaveCount(1);
  await expect(lb.scopeSelect()).toBeHidden();
  await expect(lb.weekNavigator()).toHaveCount(0);
});

test('the trophy room is a client flip with a shareable URL', async ({ page }) => {
  // #741: Honors needs no navigation (its payloads ride the shareable client caches), but the
  // tab is still mirrored into the URL — `?view=honors` deep-links straight into the room,
  // and leaving the room clears the param again.
  const lb = leaderboardPage(page);
  await lb.goto();

  await lb.openHonors();
  await expect(page).toHaveURL(/[?&]view=honors/);

  await lb.standingsTab().click();
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]view=/);

  // The deep link server-renders the room directly.
  await page.goto('/league?view=honors');
  await expect(lb.championCard()).toBeVisible();
  await expect(lb.honorsSeasonSelect()).toBeVisible();
});

test('the manage console is reachable from the League heading action', async ({ page }) => {
  // #631 lifted this out of a full-width card that rendered after </Tabs> — i.e. under both
  // tabs — into a heading action, leaving nothing outside the tab group. #660 then gated it on
  // the commissioner role, which the default E2E_USER holds (global-setup.ts).
  const lb = leaderboardPage(page);
  await lb.goto();

  await expect(lb.manageEntry()).toBeVisible();
  await lb.manageEntry().click();
  await expect(page).toHaveURL(/\/league\/manage/);
  await expect(page.getByTestId('manage-back')).toBeVisible();
});

test('a bare visit always opens on the season window', async ({ page }) => {
  // #737: the offseason default used to flip a bare visit to All-time, hiding the honors for
  // the seven months they ARE the league's content. Now the season window (anchored to the
  // last graded season) is the default year-round, in every fixture state — so this assertion
  // is deterministic on both CI's clean DB and a prod-cloned local one.
  const lb = leaderboardPage(page);
  await lb.goto();

  await expect(lb.subtitle()).toHaveText(/^\d{4} season\.$/);
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
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
  // The flip is mirrored into the URL (#737) so the career view is shareable.
  await expect(page).toHaveURL(/[?&]scope=alltime/);

  // Selecting the same season again restores the season standings + subtitle, and drops the
  // scope param from the URL.
  await lb.selectScope(seasonValue);
  await expect(lb.subtitle()).toHaveText(standingsSubtitle ?? '');
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]scope=/);
});

test('?scope=alltime deep-links straight to the career window', async ({ page }) => {
  // #737's shareable-URL contract: a pasted All-time link opens on the career table (or its
  // empty state) with no client flip needed. The ladder only renders once a member is rated,
  // and the e2e fixture never settles a decision — so it must be absent, not an empty card
  // (ADR-0032 §5: no number before the gate).
  const lb = leaderboardPage(page);
  await lb.goto({ scope: 'alltime' });

  await expect(lb.subtitle()).toHaveText('All-time · every season combined.');
  await expect(lb.allTimeTable().or(lb.allTimeEmpty())).toBeVisible();
  await expect(lb.ratingLadder()).toBeHidden();
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

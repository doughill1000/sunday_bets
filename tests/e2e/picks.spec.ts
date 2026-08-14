import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { picksBoard } from './helpers/picks-board';
import {
  makeServiceClient,
  resolveSeededGameId,
  resolveGradedGameId,
  resetPicksForGame
} from './helpers/seed';

// The seeded week has two games:
//   • BUF @ KC — unplayed, KC (home) the -3.5 favorite. The pickable card these specs drive.
//   • DAL @ PHI — played and graded 20h ago, with a locked pick already on it. Kickoff has
//     passed, so under the #832 boundary it appears NOWHERE on the board — it is represented
//     only by the handoff strip's counts.
//
// So the board's denominator is 2 and one pick is already saved before a spec touches anything:
// the counter reads "1/2 saved" at rest and "2/2 saved" once the BUF @ KC pick is locked in.
//
// A pick is saved only when the user taps "Lock in" (enabled once both a team and a weight are
// chosen); locking in collapses the card into the committed section, where it stays unlockable
// right up to its own kickoff.
//
// Selectors live in the picksBoard page object (helpers/picks-board.ts) and key off data-testid
// anchors, so UI copy changes don't ripple into these specs.
//
// Per-test isolation: a locked-in pick persists a row server-side, so each test clears the
// PICKABLE game's picks in beforeEach — never the graded game's, whose pick is fixture and whose
// settlement would be orphaned by deleting it. Every test therefore starts from the same board
// regardless of run order (the global clear only runs once).

let supabase: SupabaseClient;
let gameId: string;
let gradedGameId: string;

test.beforeAll(async () => {
  supabase = makeServiceClient();
  gameId = await resolveSeededGameId(supabase);
  gradedGameId = await resolveGradedGameId(supabase);
});

test.beforeEach(async () => {
  await resetPicksForGame(supabase, gameId);
});

test('pre-selects the spread favorite with no weight, saving nothing on load', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Favorite (KC) is pre-selected; the underdog is not.
  await board.expectTeamPressed('KC', true);
  await board.expectTeamPressed('BUF', false);

  // No weight chosen yet → Lock in is disabled and nothing new is saved.
  await expect(board.lockIn()).toBeDisabled();
  await board.expectSaved(1, 2);
  await expect(board.openCount()).toBeVisible();
});

test(
  'agreeing with the favorite locks in with weight + Lock in, collapsing to committed',
  {
    tag: '@smoke'
  },
  async ({ page }) => {
    const board = picksBoard(page);
    await board.goto();

    // Pick a weight (favorite already staged), then lock it in.
    await board.weight('High').click();
    await expect(board.lockIn()).toBeEnabled();
    await board.lockIn().click();

    // Gate on the save-complete counter, then assert the card has left the board
    // and the committed section summarises it.
    await board.expectSaved(2, 2);
    await expect(board.card()).not.toBeVisible();
    // The summary is a quiet "Committed" label since #787; the count lives in its
    // accessible name rather than the visible text.
    await expect(board.committedSummary()).toContainText('Committed');
  }
);

test('picking the underdog then a weight then Lock in saves the pick', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  await board.team('BUF').click();
  await board.weight('Medium').click();
  await board.lockIn().click();

  await board.expectSaved(2, 2);

  // The committed section is open by default, so the row is visible immediately.
  await expect(board.committedRow()).toContainText('BUF @ KC');
  await expect(board.committedRow()).toContainText('BUF +3.5');
});

test('All-In shows an inline confirm, then Lock in saves it', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Tapping All-In does not stage immediately — it asks for confirmation.
  await board.weight('All-In').click();
  await expect(board.allInConfirm()).toBeVisible();
  await board.expectSaved(1, 2);

  // Cancel leaves it unstaged.
  await board.allInCancel().click();
  await expect(board.allInConfirm()).not.toBeVisible();
  await board.expectSaved(1, 2);

  // Confirm stages All-In; Lock in then persists it and collapses to committed.
  await board.weight('All-In').click();
  await board.allInConfirm().click();
  await board.lockIn().click();
  await board.expectSaved(2, 2);
  await expect(board.allInSummary()).toContainText(/All-In:\s*KC/);
});

test('Clear removes a staged pick', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // The pre-staged favorite exposes a Clear action.
  await board.clear().click();

  // No team remains selected.
  await board.expectTeamPressed('KC', false);
  await board.expectTeamPressed('BUF', false);
});

test('Unlock returns a locked-in pick to the board', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Lock in, then reopen for editing.
  await board.weight('High').click();
  await board.lockIn().click();
  await board.expectSaved(2, 2);

  // The committed section is open by default, so the unlock control is visible immediately.
  await board.unlock().click();

  // Card is back on the board and the counter resets.
  await expect(board.card()).toBeVisible();
  await board.expectSaved(1, 2);
});

test('with prefers-reduced-motion the lock still settles to the committed state', async ({
  page
}) => {
  // The lock/unlock micro-interaction (#478) collapses to a 0ms (no-motion)
  // transition under reduced-motion. The end-state must be identical to the
  // animated path: the card leaves the grid and the committed row is present.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const board = picksBoard(page);
  await board.goto();

  await board.weight('High').click();
  await board.lockIn().click();

  await board.expectSaved(2, 2);
  await expect(board.card()).not.toBeVisible();
  await expect(board.committedRow()).toContainText('BUF @ KC');

  // Symmetric reverse still works with no motion.
  await board.unlock().click();
  await expect(board.card()).toBeVisible();
  await board.expectSaved(1, 2);
});

// --- The kickoff boundary (#832) ---------------------------------------------------------
//
// Kickoff is a hard wall on this page. Everything still actionable stays; everything under way
// leaves for `/week`, represented here by one handoff strip built entirely from database reads.

// These two assert on the kicked-off half of the board, which no test mutates — so they
// navigate plainly rather than through `board.goto()`, whose wait for a hydrated pickable card
// would couple them to whether a concurrent worker happens to have the shared BUF @ KC pick
// locked at that instant.

test('a game that has kicked off appears nowhere on the board', async ({ page }) => {
  const board = picksBoard(page);
  await page.goto('/picks');
  await expect(board.underwayStrip()).toBeVisible();

  // Not as a card, not as a committed row — the two homes a game can have on this page.
  await expect(board.anythingFor(gradedGameId)).toHaveCount(0);
  // And its matchup is not rendered anywhere else either.
  await expect(page.getByText('DAL @ PHI')).toHaveCount(0);
});

test('the handoff strip reports the underway week and links to /week', async ({ page }) => {
  const board = picksBoard(page);
  await page.goto('/picks');

  await expect(board.underwayStrip()).toBeVisible();
  // The graded game is settled, so it counts as final, not in play.
  await expect(board.underwayFinal()).toHaveText('1 final');
  await expect(board.underwayInPlay()).toHaveCount(0);
  // Its locked 'M' pick won at PHI -6.5, worth 3 points.
  await expect(board.underwayPoints()).toHaveText('+3');
  // Nothing was missed — the fixture's kicked-off game carries a pick.
  await expect(board.underwayMissed()).toHaveCount(0);
  await expect(board.seeTheWeek()).toHaveAttribute('href', '/week');
});

test('the board issues no live-scores request in any state', async ({ page }) => {
  // The whole point of the deletion: `/picks` no longer mirrors `/week`'s live layer, so it
  // must open no ESPN pass-through at all — not on load, not while locking, not after an
  // unlock, and not on a reload with a kicked-off game already on the slate. Asserted on the
  // network, not by reading the source.
  const liveRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/live-scores')) liveRequests.push(req.url());
  });

  const board = picksBoard(page);
  await board.goto();

  await board.weight('High').click();
  await board.lockIn().click();
  await board.expectSaved(2, 2);

  await board.unlock().click();
  await expect(board.card()).toBeVisible();

  await page.reload();
  await expect(board.underwayStrip()).toBeVisible();

  expect(liveRequests).toEqual([]);
});

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
//   • DAL @ PHI — played and graded 20h ago (#823), with a locked pick already on it. It never
//     reaches the open board; it exists only as a permanently-committed row.
//
// So the board's denominator is 2 and one pick is already saved before a spec touches anything:
// the counter reads "1/2 saved" at rest and "2/2 saved" once the BUF @ KC pick is locked in.
//
// A pick is saved only when the user taps "Lock in" (enabled once both a team and a weight are
// chosen); locking in collapses the card into the committed section.
//
// Selectors live in the picksBoard page object (helpers/picks-board.ts) and key off data-testid
// anchors, so UI copy changes don't ripple into these specs. Committed rows are addressed by
// game id rather than index: the section is ordered by kickoff, so the graded game is always
// row 0 and "the first row" would no longer mean "the one I just locked".
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
  await expect(board.committedRowFor(gameId)).toContainText('BUF @ KC');
  await expect(board.committedRowFor(gameId)).toContainText('BUF +3.5');
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
  await board.unlockFor(gameId).click();

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
  await expect(board.committedRowFor(gameId)).toContainText('BUF @ KC');

  // Symmetric reverse still works with no motion.
  await board.unlockFor(gameId).click();
  await expect(board.card()).toBeVisible();
  await board.expectSaved(1, 2);
});

// --- Graded committed row (#823) ---------------------------------------------------------
//
// The reported defect: a game that had finished — and been graded hours earlier — rendered
// "⏱ Kicked off" and nothing else on /picks, permanently. The board's only score source was the
// live ESPN feed, which ages out with its window (#822), and `PickGame` carried no final score
// to fall back to. The fixture game kicked off 20h ago, well past LIVE_WINDOW_MS, so no live
// query is issued for it at all: whatever renders here comes from the DB or from nothing.

test('a completed, graded game shows its final score and how the pick resolved', async ({
  page
}) => {
  const board = picksBoard(page);
  await board.goto();

  const row = board.committedRowFor(gradedGameId);
  await expect(row).toBeVisible();
  await expect(row).toContainText('DAL @ PHI');

  // The regression itself: the bare fallback must be gone from this row.
  await expect(row).not.toContainText('Kicked off');

  // Settled, and calm about it — no red LIVE chip on a game that finished yesterday.
  await expect(board.gradedFlag(gradedGameId)).toHaveText('Final');
  await expect(row.getByTestId('live-flag')).toHaveCount(0);

  // PHI 27, DAL 20 — rendered away-first to match the "AWAY @ HOME" title.
  await expect(board.gradedResult(gradedGameId)).toContainText('DAL 20–27 PHI');

  // The pick took PHI -6.5 and covered by half a point, settled as a win worth the Medium
  // weight's 3 points. Points, not a spread cushion — the live row's language would be
  // "Covering +0.5", and the two must not be confusable.
  await expect(board.gradedOutcome(gradedGameId)).toHaveText('Win +3');
});

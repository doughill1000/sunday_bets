import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { picksBoard } from './helpers/picks-board';
import { makeServiceClient, resolveSeededGameId, resetPicksForGame } from './helpers/seed';

// The seeded board has one game: BUF @ KC, with KC (home) the -3.5 favorite.
// A pick is saved only when the user taps "Lock in" (enabled once both a team and
// a weight are chosen); locking in collapses the card into the committed section.
//
// Selectors live in the picksBoard page object (helpers/picks-board.ts) and key
// off data-testid anchors, so UI copy changes don't ripple into these specs.
//
// Per-test isolation: a locked-in pick persists a row server-side, so each test
// clears the seeded game's picks in beforeEach. Every test therefore starts from a
// "0 saved" board regardless of run order (the global clear only runs once).

let supabase: SupabaseClient;
let gameId: string;

test.beforeAll(async () => {
  supabase = makeServiceClient();
  gameId = await resolveSeededGameId(supabase);
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

  // No weight chosen yet → Lock in is disabled and nothing is saved.
  await expect(board.lockIn()).toBeDisabled();
  await board.expectSaved(0, 1);
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
    await board.expectSaved(1, 1);
    await expect(board.card()).not.toBeVisible();
    await expect(board.committedSummary()).toContainText('committed pick');
  }
);

test('picking the underdog then a weight then Lock in saves the pick', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  await board.team('BUF').click();
  await board.weight('Medium').click();
  await board.lockIn().click();

  await board.expectSaved(1, 1);

  // The committed row reflects the underdog pick.
  await board.committedSummary().click();
  await expect(board.committedRow()).toContainText('BUF @ KC');
  await expect(board.committedRow()).toContainText('BUF +3.5');
});

test('All-In shows an inline confirm, then Lock in saves it', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Tapping All-In does not stage immediately — it asks for confirmation.
  await board.weight('All-In').click();
  await expect(board.allInConfirm()).toBeVisible();
  await board.expectSaved(0, 1);

  // Cancel leaves it unstaged.
  await board.allInCancel().click();
  await expect(board.allInConfirm()).not.toBeVisible();
  await board.expectSaved(0, 1);

  // Confirm stages All-In; Lock in then persists it and collapses to committed.
  await board.weight('All-In').click();
  await board.allInConfirm().click();
  await board.lockIn().click();
  await board.expectSaved(1, 1);
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
  await board.expectSaved(1, 1);

  await board.committedSummary().click();
  await board.unlock().click();

  // Card is back on the board and the counter resets.
  await expect(board.card()).toBeVisible();
  await board.expectSaved(0, 1);
});

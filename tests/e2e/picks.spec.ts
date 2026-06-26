import { test, expect } from '@playwright/test';
import { picksBoard } from './helpers/picks-board';

// The seeded board has one game: BUF @ KC, with KC (home) the -3.5 favorite.
// Auto-save replaces the old Lock button: picks save the moment a team AND a
// weight are both chosen, then collapse into the committed section.
//
// Selectors live in the picksBoard page object (helpers/picks-board.ts) and key
// off data-testid anchors, so UI copy changes don't ripple into these specs.

test('pre-selects the spread favorite with no weight, saving nothing on load', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Favorite (KC) is pre-selected; the underdog is not.
  await board.expectTeamPressed('KC', true);
  await board.expectTeamPressed('BUF', false);

  // No weight chosen yet → the "action needed" hint is shown and nothing is saved.
  await expect(board.needsWeightHint()).toBeVisible();
  await board.expectSaved(0, 1);
  await expect(board.openCount()).toBeVisible();
});

test('agreeing with the favorite saves in a single tap and collapses to committed', async ({
  page
}) => {
  const board = picksBoard(page);
  await board.goto();

  // One tap: just the weight (favorite already staged).
  await board.weight('High').click();

  // Gate on the save-complete counter first (auto-save is a ~700 ms debounce +
  // RPC), then assert the card has left the board and committed summarises it.
  await board.expectSaved(1, 1);
  await expect(board.card()).not.toBeVisible();
  await expect(board.committedSummary()).toContainText('committed pick');
});

test('switching to the underdog then a weight is a two-tap save', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Tap 1: the underdog. Tap 2: a weight.
  await board.team('BUF').click();
  await board.weight('Medium').click();

  await board.expectSaved(1, 1);

  // The committed row reflects the underdog pick.
  await board.committedSummary().click();
  await expect(board.committedRow()).toContainText('BUF @ KC');
  await expect(board.committedRow()).toContainText('BUF +3.5');
});

test('All-In shows an inline confirm before it saves', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Tapping All-In does not save immediately — it asks for confirmation.
  await board.weight('All-In').click();
  await expect(board.allInConfirm()).toBeVisible();
  await board.expectSaved(0, 1);

  // Cancel leaves it unsaved.
  await board.allInCancel().click();
  await expect(board.allInConfirm()).not.toBeVisible();
  await board.expectSaved(0, 1);

  // Confirm saves it as the All-In and collapses to committed.
  await board.weight('All-In').click();
  await board.allInConfirm().click();
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

test('Edit returns a saved pick to the board', async ({ page }) => {
  const board = picksBoard(page);
  await board.goto();

  // Save in one tap, then reopen for editing.
  await board.weight('High').click();
  await board.expectSaved(1, 1);

  await board.committedSummary().click();
  await board.edit().click();

  // Card is back on the board and the counter resets.
  await expect(board.card()).toBeVisible();
  await board.expectSaved(0, 1);
});

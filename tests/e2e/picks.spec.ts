import { test, expect } from '@playwright/test';

// The seeded board has one game: BUF @ KC, with KC (home) the -3.5 favorite.
// Auto-save replaces the old Lock button: picks save the moment a team AND a
// weight are both chosen, then collapse into the committed section.

test('pre-selects the spread favorite with no weight, saving nothing on load', async ({ page }) => {
  await page.goto('/picks');

  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();

  // Favorite (KC) is pre-selected; the underdog is not.
  await expect(teamGroup.getByRole('button', { name: 'KC' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(teamGroup.getByRole('button', { name: 'BUF' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );

  // No weight chosen yet → the "action needed" hint is shown and nothing is saved.
  await expect(page.getByText(/Choose a weight to save/)).toBeVisible();
  await expect(page.getByText('0/1 saved')).toBeVisible();
  await expect(page.getByText(/to pick/)).toBeVisible();
});

test('agreeing with the favorite saves in a single tap and collapses to committed', async ({
  page
}) => {
  await page.goto('/picks');
  await expect(page.getByRole('group', { name: 'Pick a team' }).first()).toBeVisible();

  // One tap: just the weight (favorite already staged).
  await page.getByRole('radio', { name: /High/ }).first().click();

  // The card leaves the board and the committed section summarises it.
  await expect(page.getByRole('group', { name: 'Pick a team' })).not.toBeVisible();
  await expect(page.getByText(/committed pick/)).toBeVisible();
  await expect(page.getByText('1/1 saved')).toBeVisible();
});

test('switching to the underdog then a weight is a two-tap save', async ({ page }) => {
  await page.goto('/picks');
  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();

  // Tap 1: the underdog. Tap 2: a weight.
  await teamGroup.getByRole('button', { name: 'BUF' }).click();
  await page
    .getByRole('radio', { name: /Medium/ })
    .first()
    .click();

  await expect(page.getByText('1/1 saved')).toBeVisible();

  // The committed row reflects the underdog pick.
  await page.getByText(/committed pick/).click();
  await expect(page.getByText('BUF @ KC')).toBeVisible();
  await expect(page.getByText(/BUF \+3\.5/)).toBeVisible();
});

test('All-In shows an inline confirm before it saves', async ({ page }) => {
  await page.goto('/picks');
  await expect(page.getByRole('group', { name: 'Pick a team' }).first()).toBeVisible();

  // Tapping All-In does not save immediately — it asks for confirmation.
  await page
    .getByRole('radio', { name: /All-In/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Confirm All-In' })).toBeVisible();
  await expect(page.getByText('1/1 saved')).not.toBeVisible();

  // Cancel leaves it unsaved.
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Confirm All-In' })).not.toBeVisible();
  await expect(page.getByText('0/1 saved')).toBeVisible();

  // Confirm saves it as the All-In and collapses to committed.
  await page
    .getByRole('radio', { name: /All-In/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Confirm All-In' }).click();
  await expect(page.getByText('1/1 saved')).toBeVisible();
  await expect(page.getByText(/All-In:\s*KC/)).toBeVisible();
});

test('Clear removes a staged pick', async ({ page }) => {
  await page.goto('/picks');
  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();

  // The pre-staged favorite exposes a Clear action.
  await page.getByRole('button', { name: 'Clear pick' }).click();

  // No team remains selected.
  await expect(teamGroup.getByRole('button', { name: 'KC' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await expect(teamGroup.getByRole('button', { name: 'BUF' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
});

test('Edit returns a saved pick to the board', async ({ page }) => {
  await page.goto('/picks');
  await expect(page.getByRole('group', { name: 'Pick a team' }).first()).toBeVisible();

  // Save in one tap, then reopen for editing.
  await page.getByRole('radio', { name: /High/ }).first().click();
  await expect(page.getByText('1/1 saved')).toBeVisible();

  await page.getByText(/committed pick/).click();
  await page.getByRole('button', { name: 'Edit' }).first().click();

  // Card is back on the board and the counter resets.
  await expect(page.getByRole('group', { name: 'Pick a team' }).first()).toBeVisible();
  await expect(page.getByText('0/1 saved')).toBeVisible();
});

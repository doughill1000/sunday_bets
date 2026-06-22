import { test, expect } from '@playwright/test';

test('user can lock a pick on the active-week board', async ({ page }) => {
  await page.goto('/picks');

  // The seeded board has one game (BUF @ KC). Pick a team.
  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();
  await teamGroup.getByRole('button', { name: 'KC' }).click();

  // Choose a weight (the toggle items render their label, e.g. "High").
  await page.getByRole('radio', { name: /High/ }).first().click();

  // Lock it.
  const lockBtn = page.getByRole('button', { name: 'Lock Pick' }).first();
  await expect(lockBtn).toBeEnabled();
  await lockBtn.click();

  // A locked pick exposes an Unlock control.
  await expect(page.getByRole('button', { name: /Unlock/ }).first()).toBeVisible();
});

test('summary bar shows unlocked warning before any picks', async ({ page }) => {
  await page.goto('/picks');

  // The summary bar renders above the game cards.
  // With one seeded game and no picks locked, it should warn.
  await expect(page.getByText(/not locked/)).toBeVisible();
  // Locked count starts at 0.
  await expect(page.getByText('0/1')).toBeVisible();
});

test('summary bar updates after locking a pick', async ({ page }) => {
  await page.goto('/picks');

  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();
  await teamGroup.getByRole('button', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Lock Pick' }).first().click();
  await expect(page.getByRole('button', { name: /Unlock/ }).first()).toBeVisible();

  // After locking: count updates and the warning badge disappears.
  await expect(page.getByText('1/1')).toBeVisible();
  await expect(page.getByText(/not locked/)).not.toBeVisible();
});

test('locked pick appears in the committed section and game card is removed from board', async ({
  page
}) => {
  await page.goto('/picks');

  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();
  await teamGroup.getByRole('button', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Lock Pick' }).first().click();
  await expect(page.getByRole('button', { name: /Unlock/ }).first()).toBeVisible();

  // The game card (Pick a team group) should no longer be on the board.
  await expect(page.getByRole('group', { name: 'Pick a team' })).not.toBeVisible();

  // The committed section should summarise the locked pick.
  await expect(page.getByText(/committed pick/)).toBeVisible();
});

test('locked picks section is collapsed by default and can be expanded', async ({ page }) => {
  await page.goto('/picks');

  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();
  await teamGroup.getByRole('button', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Lock Pick' }).first().click();
  await expect(page.getByRole('button', { name: /Unlock/ }).first()).toBeVisible();

  // The <details> summary is visible; BUF @ KC should not be readable yet.
  const summary = page.getByText(/committed pick/);
  await expect(summary).toBeVisible();
  await expect(page.getByText('BUF @ KC')).not.toBeVisible();

  // Expand it — the matchup row appears.
  await summary.click();
  await expect(page.getByText('BUF @ KC')).toBeVisible();
});

test('edit from locked section moves pick back to the active board', async ({ page }) => {
  await page.goto('/picks');

  const teamGroup = page.getByRole('group', { name: 'Pick a team' }).first();
  await expect(teamGroup).toBeVisible();
  await teamGroup.getByRole('button', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Lock Pick' }).first().click();
  await expect(page.getByRole('button', { name: /Unlock/ }).first()).toBeVisible();

  // Expand the committed section, then click Edit.
  const summary = page.getByText(/committed pick/);
  await summary.click();
  await expect(page.getByText('BUF @ KC')).toBeVisible();

  const editBtn = page.getByRole('button', { name: 'Edit' }).first();
  await expect(editBtn).toBeVisible();
  await editBtn.click();

  // Game card is back on the active board.
  await expect(page.getByRole('group', { name: 'Pick a team' }).first()).toBeVisible();
  // Summary bar shows 0 locked again.
  await expect(page.getByText('0/1')).toBeVisible();
});

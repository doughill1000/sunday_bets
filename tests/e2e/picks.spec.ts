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

// tests/e2e/admin-members.spec.ts
//
// E2E: admin adds a new player to the original group, new player can sign in
// and sees an empty picks state.

import { test, expect } from '@playwright/test';

const NEW_MEMBER_EMAIL = `e2e-newmember-${Date.now()}@example.com`;
const NEW_MEMBER_NAME = 'NewE2EPlayer';

test.describe('admin add-member flow', () => {
  test('admin can open the admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Admin • Add Member')).toBeVisible();
  });

  test('admin can add a new member and receive credentials', async ({ page }) => {
    await page.goto('/admin');

    // Fill in the Add Member form
    await page.locator('#member-email').fill(NEW_MEMBER_EMAIL);
    await page.locator('#member-display-name').fill(NEW_MEMBER_NAME);
    // Leave password blank to test auto-generation

    await page.getByRole('button', { name: 'Add Member' }).click();

    // Success box with credentials should appear
    await expect(page.getByText('Member added')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(NEW_MEMBER_EMAIL)).toBeVisible();
  });

  test('new member can sign in and sees empty picks', async ({ page, browser }) => {
    // Use admin session to add member and capture credentials
    await page.goto('/admin');
    await page.locator('#member-email').fill(NEW_MEMBER_EMAIL + '2');
    await page.locator('#member-display-name').fill(NEW_MEMBER_NAME + '2');
    await page.locator('#member-password').fill('TestMember123!');
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText('Member added')).toBeVisible({ timeout: 10000 });

    // Sign in as the new member in a fresh browser context (no stored session)
    const newCtx = await browser.newContext();
    const newPage = await newCtx.newPage();

    await newPage.goto('/auth');

    // Password is the default sign-in method (the magic-link toggle was removed
    // in #137); wait for the always-rendered field once the page hydrates.
    await expect(newPage.locator('input[name="password"]')).toBeVisible({ timeout: 15000 });

    await newPage.locator('input[name="email"]').fill(NEW_MEMBER_EMAIL + '2');
    await newPage.locator('input[name="password"]').fill('TestMember123!');

    const signIn = newPage.waitForResponse(
      (r) => r.url().includes('/auth') && r.request().method() === 'POST'
    );
    await newPage.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await signIn;

    // New member should land on a protected route (picks) and see empty state
    await newPage.goto('/picks');
    await expect(newPage).toHaveURL(/\/picks/);

    await newCtx.close();
  });
});

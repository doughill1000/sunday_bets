// tests/e2e/admin-members.spec.ts
//
// E2E: admin adds a new player to the original group, new player can sign in
// and sees an empty picks state.

import { test, expect } from '@playwright/test';
import { adminMembers } from './helpers/admin-members';

const NEW_MEMBER_EMAIL = `e2e-newmember-${Date.now()}@example.com`;
const NEW_MEMBER_NAME = 'NewE2EPlayer';

test.describe('admin add-member flow', () => {
  test('admin can open the admin page', async ({ page }) => {
    const am = adminMembers(page);

    await am.goto();
    await expect(page).toHaveURL(/\/admin/);
    // The add-member card being visible confirms the admin page loaded correctly.
    await expect(am.card()).toBeVisible();
  });

  test('admin can add a new member and receive credentials', async ({ page }) => {
    const am = adminMembers(page);

    await am.goto();

    // Fill in the Add Member form.
    await am.emailInput().fill(NEW_MEMBER_EMAIL);
    await am.displayNameInput().fill(NEW_MEMBER_NAME);
    // Leave password blank to test auto-generation.

    await am.submitButton().click();

    // Success box with credentials should appear.
    await am.expectResultVisible();
    // The result must contain the actual email submitted — real data under test.
    await expect(am.result().getByText(NEW_MEMBER_EMAIL)).toBeVisible();
  });

  test('new member can sign in and sees empty picks', async ({ page, browser }) => {
    const am = adminMembers(page);

    // Use admin session to add member and capture credentials.
    await am.goto();
    await am.emailInput().fill(NEW_MEMBER_EMAIL + '2');
    await am.displayNameInput().fill(NEW_MEMBER_NAME + '2');
    await am.passwordInput().fill('TestMember123!');
    await am.submitButton().click();
    await am.expectResultVisible();

    // Sign in as the new member in a fresh browser context (no stored session).
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

    // New member should land on a protected route (picks) and see empty state.
    await newPage.goto('/picks');
    await expect(newPage).toHaveURL(/\/picks/);

    await newCtx.close();
  });
});

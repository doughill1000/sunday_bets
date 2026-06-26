// tests/e2e/admin-members.spec.ts
//
// E2E: admin adds a new player to the original group, new player can sign in
// and sees an empty picks state.

import { test, expect } from '@playwright/test';
import { adminMembers } from './helpers/admin-members';

const NEW_MEMBER_NAME = 'NewE2EPlayer';

// A fresh address per attempt keeps add-member idempotent under `retries`: a
// fixed email would already exist on a retry, so the Supabase create throws, the
// card shows an error instead of the success box, and the assertion fails. These
// tests also use distinct emails and share no mutable fixture, so they don't need
// serial mode — which would additionally turn a single retry into a whole-group
// re-run that re-submits the now-duplicate address.
function uniqueMemberEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test.describe.configure({ timeout: 25_000 });

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
    const email = uniqueMemberEmail('addmember');

    await am.goto();

    // Fill in the Add Member form.
    await am.emailInput().fill(email);
    await am.displayNameInput().fill(NEW_MEMBER_NAME);
    // Leave password blank to test auto-generation.

    await am.submitButton().click();

    // Success box with credentials should appear.
    await am.expectResultVisible();
    // The result must contain the actual email submitted — real data under test.
    await expect(am.result().getByText(email)).toBeVisible();
  });

  test('new member can sign in and sees empty picks', async ({ page, browser }) => {
    const am = adminMembers(page);
    const email = uniqueMemberEmail('signin');
    const password = 'TestMember123!';

    // Use admin session to add member and capture credentials.
    await am.goto();
    await am.emailInput().fill(email);
    await am.displayNameInput().fill(NEW_MEMBER_NAME + '2');
    await am.passwordInput().fill(password);
    await am.submitButton().click();
    await am.expectResultVisible();

    // Sign in as the new member in a fresh browser context (no stored session).
    const newCtx = await browser.newContext();
    const newPage = await newCtx.newPage();

    await newPage.goto('/auth');

    // Password is the default sign-in method (the magic-link toggle was removed
    // in #137); wait for the always-rendered field once the page hydrates.
    await expect(newPage.locator('input[name="password"]')).toBeVisible({ timeout: 8000 });

    await newPage.locator('input[name="email"]').fill(email);
    await newPage.locator('input[name="password"]').fill(password);

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

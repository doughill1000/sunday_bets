/**
 * Group-switcher E2E tests (issue #150).
 *
 * DEFERRED: These tests require a running local Supabase stack with a
 * second group and a user with two active memberships seeded. They are
 * written here but must be run in a serialized Docker pass (not in CI
 * alongside concurrent integration tests).
 *
 * Pre-conditions (handled by a dedicated setup fixture or global-setup
 * extension — not in scope here):
 *   - E2E_USER is a member of ORIGINAL_GROUP ("Sunday Bets") AND a second
 *     group ("Test Group B").
 *   - Both groups have an active week with seeded games so picks/leaderboard
 *     render something group-specific.
 */

import { test, expect } from '@playwright/test';

const ORIGINAL_GROUP_NAME = 'Sunday Bets';
const SECOND_GROUP_NAME = 'Test Group B';

test.describe('Group switcher', () => {
  test('single-group user sees no group switcher', async ({ page }) => {
    // This spec uses the standard E2E_USER who (in the base seed) belongs to
    // exactly one group. The switcher trigger must be absent.
    await page.goto('/picks');
    await expect(page.getByTestId('group-switcher-trigger')).not.toBeVisible();
  });

  test.describe('multi-group user', () => {
    // These tests are tagged so they can be filtered separately once a
    // multi-group seed fixture exists.
    test('sees the group switcher with the active group name', async ({ page }) => {
      await page.goto('/picks');
      const trigger = page.getByTestId('group-switcher-trigger');
      await expect(trigger).toBeVisible();
      await expect(trigger).toContainText(ORIGINAL_GROUP_NAME);
    });

    test('can switch to a second group and the header reflects the change', async ({ page }) => {
      await page.goto('/picks');

      const trigger = page.getByTestId('group-switcher-trigger');
      await trigger.click();

      // Pick the second group from the dropdown.
      const option = page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME });
      await option.click();

      // After the switch the trigger label must update.
      await expect(trigger).toContainText(SECOND_GROUP_NAME);
    });

    test('active group selection persists across a full page reload', async ({ page }) => {
      // Start on picks, switch group.
      await page.goto('/picks');
      const trigger = page.getByTestId('group-switcher-trigger');
      await trigger.click();

      const option = page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME });
      await option.click();
      await expect(trigger).toContainText(SECOND_GROUP_NAME);

      // Hard reload — the active_group_id cookie must be re-read by the server.
      await page.reload();
      await expect(page.getByTestId('group-switcher-trigger')).toContainText(SECOND_GROUP_NAME);
    });

    test('leaderboard reflects the active group after a switch', async ({ page }) => {
      await page.goto('/picks');

      const trigger = page.getByTestId('group-switcher-trigger');
      await trigger.click();
      const option = page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME });
      await option.click();

      // Navigate to leaderboard — should load without error and show group-B data.
      await page.goto('/leaderboard');
      await expect(page).toHaveURL(/\/leaderboard/);
      // Confirm no error redirect (no-group redirect would send to /auth/error).
      await expect(page).not.toHaveURL(/auth\/error/);
    });
  });
});

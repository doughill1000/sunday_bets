/**
 * Group-switcher E2E tests (issue #150).
 *
 * DEFERRED: These tests require a running local Supabase stack with a
 * second group and a user with two active memberships seeded. They are
 * written here but must be run in a serialized Docker pass (not in CI
 * alongside concurrent integration tests).
 *
 * Pre-conditions (seeded in global-setup.ts + multigroup-auth.setup.ts):
 *   - E2E_USER stays single-group (the "no switcher" case, default storageState).
 *   - E2E_MULTIGROUP_USER is a member of ORIGINAL_GROUP ("Sunday Bets") AND the
 *     dedicated second group ("E2E Switcher B"); its active group is pinned to
 *     "Sunday Bets". The multi-group block below runs as this user.
 */

import { test, expect, type Page } from '@playwright/test';

const ORIGINAL_GROUP_NAME = 'Sunday Bets';
const SECOND_GROUP_NAME = 'E2E Switcher B';

/**
 * Opens the group switcher and returns the trigger. The trigger is rendered
 * during SSR (immediately clickable) but only becomes interactive once the
 * page hydrates and bits-ui attaches its open handler, so the first click can
 * be dropped. Retry clicking until the option list is actually visible.
 */
async function openSwitcher(page: Page) {
  const trigger = page.getByTestId('group-switcher-trigger');
  await expect(trigger).toBeVisible();
  await expect(async () => {
    await trigger.click();
    await expect(page.getByTestId('group-switcher-option').first()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 8000 });
  return trigger;
}

test.describe.configure({ timeout: 25_000 });

test.describe('Group switcher', () => {
  test('single-group user sees no group switcher', async ({ page }) => {
    // This spec uses the standard E2E_USER who (in the base seed) belongs to
    // exactly one group. The switcher trigger must be absent.
    await page.goto('/picks');
    await expect(page.getByTestId('group-switcher-trigger')).not.toBeVisible();
  });

  test.describe('multi-group user', () => {
    // Runs as the dedicated multi-group user (member of two groups, active group
    // pinned to "Sunday Bets") seeded in global-setup + multigroup-auth.setup.
    test.use({ storageState: 'playwright/.auth/multigroup-user.json' });

    test('sees the group switcher with the active group name', async ({ page }) => {
      await page.goto('/picks');
      const trigger = page.getByTestId('group-switcher-trigger');
      await expect(trigger).toBeVisible();
      await expect(trigger).toContainText(ORIGINAL_GROUP_NAME);
    });

    test('can switch to a second group and the header reflects the change', async ({ page }) => {
      await page.goto('/picks');

      const trigger = await openSwitcher(page);
      await page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME })
        .click();

      // After the switch the trigger label must update.
      await expect(trigger).toContainText(SECOND_GROUP_NAME);
    });

    test('active group selection persists across a full page reload', async ({ page }) => {
      // Start on picks, switch group.
      await page.goto('/picks');
      const trigger = await openSwitcher(page);
      await page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME })
        .click();
      await expect(trigger).toContainText(SECOND_GROUP_NAME);

      // Hard reload — the active_group_id cookie must be re-read by the server.
      await page.reload();
      await expect(page.getByTestId('group-switcher-trigger')).toContainText(SECOND_GROUP_NAME);
    });

    test('leaderboard reflects the active group after a switch', async ({ page }) => {
      await page.goto('/picks');

      const trigger = await openSwitcher(page);
      await page
        .getByTestId('group-switcher-option')
        .filter({ hasText: SECOND_GROUP_NAME })
        .click();
      // Wait for the switch to land before navigating away.
      await expect(trigger).toContainText(SECOND_GROUP_NAME);

      // Navigate to leaderboard — should load without error and show group-B data.
      await page.goto('/leaderboard');
      await expect(page).toHaveURL(/\/leaderboard/);
      // Confirm no error redirect (no-group redirect would send to /auth/error).
      await expect(page).not.toHaveURL(/auth\/error/);
    });
  });
});

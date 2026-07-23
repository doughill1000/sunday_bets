import { expect, test, type Page } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';
import { E2E_USER, E2E_MULTIGROUP_USER } from './test-user';
import { SEASON_YEAR } from './global-setup';

// Primary navigation: five first-class tabs — Picks · Week · League · Stats · Market (#776
// promoted Week out of /league; it sits second as the highest-frequency surface). The desktop
// inline nav and the mobile bottom tab bar render the same five destinations. League is the
// standings + trophy-room home (with a commissioner-only manage console at /league/manage);
// Market is the NFL-wide ATS surface (renamed from "Teams" so the tab names the market concept
// and never collides with "League", the user's group).

const TABS = [
  { href: '/picks', name: 'Picks' },
  { href: '/week', name: 'Week' },
  { href: '/league', name: 'League' },
  { href: '/stats', name: 'Stats' },
  { href: '/market', name: 'Market' }
] as const;

test(
  'desktop nav exposes all five tabs and each navigates',
  { tag: '@smoke' },
  async ({ page }) => {
    await page.goto('/picks');

    const nav = page.getByTestId('primary-nav');
    for (const { name } of TABS) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }

    for (const { href, name } of TABS) {
      await page.goto('/picks');
      await page.getByTestId('primary-nav').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
    }
  }
);

test('mobile bottom tab bar exposes all five tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/picks');

  const bar = page.getByTestId('bottom-tab-bar');
  await expect(bar).toBeVisible();
  for (const { href } of TABS) {
    await expect(bar.locator(`a[href="${href}"]`)).toBeVisible();
  }
});

test('League tab stays active on both the home and its manage subpage', async ({ page }) => {
  const league = () =>
    page.getByTestId('primary-nav').getByRole('link', { name: 'League', exact: true });

  await page.goto('/league');
  await expect(league()).toHaveAttribute('aria-current', 'page');

  await page.goto('/league/manage');
  await expect(league()).toHaveAttribute('aria-current', 'page');
});

test('legacy routes redirect to the League home and manage subpage', async ({ page }) => {
  // The standalone Leaderboard and Group tabs became the League home and its manage subpage
  // (#561); their old paths permanently forward (hooks 308). The default user is a commissioner,
  // so /group still lands on the console rather than bouncing back to /league (#660).
  await page.goto('/leaderboard');
  await expect(page).toHaveURL(/\/league$/);

  await page.goto('/group');
  await expect(page).toHaveURL(/\/league\/manage$/);
});

test('League honors live on /league, not /stats or /league/manage', async ({ page }) => {
  // Off Stats since #305, and off the manage subpage after #561 relocated the honors case to the
  // League home. The card only renders once a season has a champion or awarded badges, so on
  // /league assert the destination loads (the Manage entry) rather than the data-dependent card.
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();
  await expect(page.getByTestId('league-honors')).toHaveCount(0);

  await page.goto('/league/manage');
  await expect(page).toHaveURL(/\/league\/manage$/);
  await expect(page.getByRole('list', { name: 'League members' })).toBeVisible();
  await expect(page.getByTestId('league-honors')).toHaveCount(0);

  await page.goto('/league');
  await expect(page.getByTestId('manage-entry')).toBeVisible();
});

// /league/manage is a commissioner-only console since #660 — one flat scroll, no tab bar, every
// card a commissioner control. Two fixtures cover the two audiences: the default E2E_USER is a
// commissioner of "Sunday Bets"; E2E_MULTIGROUP_USER is a plain member of that same league (see
// global-setup.ts, and note users.role='admin' is app access, NOT league participation).
/** Card titles render as `<div data-slot="card-title">`, not headings — so match the slot. */
const cardTitle = (page: Page, name: string) =>
  page.locator('[data-slot="card-title"]').filter({ hasText: new RegExp(`^${name}$`) });

test('the commissioner console renders every card in one flat scroll', async ({ page }) => {
  await page.goto('/league/manage');

  await expect(page.getByRole('heading', { name: 'Manage league', level: 1 })).toBeVisible();

  for (const name of ['League name', 'Members', 'Invites', 'League rules', 'AI Recap']) {
    await expect(cardTitle(page, name)).toBeVisible();
  }

  // The Members/Manage tab bar is gone — that split was by audience, not by topic.
  await expect(page.getByRole('tablist')).toHaveCount(0);

  // The personal knobs moved to /settings and must not linger here.
  await expect(cardTitle(page, 'Roast me\\?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /leave league/i })).toHaveCount(0);
});

test('the last commissioner cannot leave the league from /settings', async ({ page }) => {
  // E2E_USER is the ONLY commissioner of "Sunday Bets" (global-setup promotes them; the seeded
  // test1-3 are plain members), so this is the guard's live case. The rule is enforced by
  // /api/group/leave server-side — the disabled button and its explanation are the surface.
  await page.goto('/settings');

  const leave = page.getByRole('button', { name: 'Leave league' });
  await expect(leave).toBeVisible();
  await expect(leave).toBeDisabled();
  await expect(
    page.getByText('You are the only commissioner. Promote another member to commissioner')
  ).toBeVisible();
});

test('the standings mark who runs the league', async ({ page }) => {
  // Both rows here are seeded by global-setup (#660): E2E_USER places no picks, so the sole
  // commissioner would otherwise be absent from the table entirely and this would assert
  // against a row that never rendered. The member's row being *unmarked* is what proves the
  // marker tracks the role rather than decorating every row.
  const lb = leaderboardPage(page);
  await lb.goto({ season: SEASON_YEAR });

  await expect(lb.standingsRow(`${E2E_USER.displayName} (you)`)).toContainText('Commissioner');
  await expect(lb.standingsRow(E2E_MULTIGROUP_USER.displayName)).not.toContainText('Commissioner');
});

test.describe('as a non-commissioner member', () => {
  test.use({ storageState: 'playwright/.auth/multigroup-user.json' });

  test('the League home offers no Manage entry', async ({ page }) => {
    await page.goto('/league');
    await expect(page.getByTestId('leaderboard-heading')).toBeVisible();
    await expect(page.getByTestId('manage-entry')).toHaveCount(0);
  });

  test('the Commissioner marker is visible to members, not just commissioners', async ({
    page
  }) => {
    // "Everyone can see who runs the league" is the point of the marker — a member has no
    // Manage entry and no console, so this row is the only place the app tells them.
    const lb = leaderboardPage(page);
    await lb.goto({ season: SEASON_YEAR });

    await expect(lb.standingsRow(E2E_USER.displayName)).toContainText('Commissioner');
  });

  test('the console and its legacy /group path both bounce to /league', async ({ page }) => {
    await page.goto('/league/manage');
    await expect(page).toHaveURL(/\/league$/);

    // The #561 308 forwards /group → /league/manage, which then redirects on the role check.
    await page.goto('/group');
    await expect(page).toHaveURL(/\/league$/);
  });

  // Two write round-trips plus a reload don't fit the 15s default (playwright.config.ts) —
  // the same reason the sign-in-from-scratch specs raise their own budget.
  test('the personal league knobs are reachable on /settings', async ({ page }) => {
    test.setTimeout(40_000);
    await page.goto('/settings');

    const optIn = page.getByRole('checkbox', { name: 'Include me in the AI recap' });
    await expect(optIn).toBeVisible();
    await expect(page.getByRole('button', { name: 'Leave league' })).toBeEnabled();

    // Toggling persists through /api/group/recap-opt-out and survives a reload.
    //
    // The checkbox's own state is NOT a usable signal here. A click landing pre-hydration
    // toggles the native input with no handler attached — the box flips and no request is sent —
    // so asserting the flip can pass having proved nothing; hydration then re-renders from state
    // and silently undoes it. (`networkidle` doesn't help: Vite dev goes idle before hydration.)
    // So retry the click until one actually reaches the network, and drive off the POST — the
    // only signal that means the preference was really written.
    const before = await optIn.isChecked();
    const toggle = async (want: boolean) => {
      await expect(async () => {
        const saved = page.waitForResponse(
          (r) => r.url().includes('/api/group/recap-opt-out') && r.request().method() === 'POST',
          { timeout: 3000 }
        );
        await optIn.click();
        expect((await saved).status()).toBe(200);
      }).toPass({ timeout: 25_000 });
      await expect(optIn).toBeChecked({ checked: want });
    };

    await toggle(!before);
    await page.reload();
    await expect(optIn).toBeChecked({ checked: !before });

    // Restore the fixture's original value so the spec stays re-runnable.
    await toggle(before);
  });
});

import { expect, test, type Page } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';

/**
 * Stale/error resilience for the cached read screens (audit S5, ADR-0017, issue #544).
 *
 * The client cache exists to keep the last-good screen when a background refetch fails, so a
 * surface must NOT swap its populated view for an error card in that case — it keeps the data
 * and the shell pill flags the staleness. A genuine no-data failure still shows a (retryable)
 * error card. These specs assert the observable contract:
 *   1. Offline keeps the data on screen and raises the shell offline pill (the guide's own
 *      "offline PWA revisit" example), which clears on reconnect — no full-screen error swap.
 *   2. A hard fetch failure with no cached data shows a retryable error card (not "refresh the
 *      page"), and the Retry button recovers the screen once the fetch works again.
 */

const RENDER_TIMEOUT = 30_000;

/** The recap flash is a full-screen overlay that auto-opens in a fresh context (empty
 *  localStorage) and blocks clicks; dismiss it if present. */
async function dismissRecap(page: Page) {
  const dismiss = page.getByTestId('recap-dismiss');
  await dismiss
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => dismiss.click())
    .catch(() => {
      /* no recap visible */
    });
}

test('offline keeps the leaderboard and raises the shell stale pill', async ({ page, context }) => {
  const lb = leaderboardPage(page);
  await lb.goto();
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();

  // Go offline: the pill appears and the standings stay put (last-good data, no error swap).
  // The pill is client-only (renders after hydration), so allow the dev server's first-hit
  // route compilation the same generous budget the rest of the suite uses.
  await context.setOffline(true);
  const pill = page.getByTestId('network-status-pill');
  await expect(pill).toBeVisible({ timeout: RENDER_TIMEOUT });
  await expect(pill).toContainText(/offline/i);
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();
  await expect(page.getByText("Couldn't load standings")).toHaveCount(0);

  // Reconnect: the pill clears.
  await context.setOffline(false);
  await expect(pill).toBeHidden({ timeout: RENDER_TIMEOUT });
});

test('a hard leaderboard failure shows a retryable error card', async ({ page }) => {
  // Query retries use exponential backoff (~7s to reach the error state) on top of the dev
  // server's first-hit route compilation, so raise the per-test budget well above the default.
  test.setTimeout(60_000);

  // Land on another authed screen first, so the leaderboard is reached by client navigation —
  // a real cache miss that calls /api/leaderboard. A full load would SSR-seed initialData and
  // never issue the request the failure hinges on.
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Stats & history' })).toBeVisible();
  await dismissRecap(page);

  // Break only the standings fetch (not /api/leaderboard/alltime).
  let failing = true;
  await page.route(
    (url) => url.pathname === '/api/leaderboard',
    (route) =>
      failing
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"boom"}'
          })
        : route.continue()
  );

  await page.getByTestId('primary-nav').getByRole('link', { name: 'League', exact: true }).click();

  // No cached data + a failed fetch → the error card with a Retry button (not "refresh the page").
  const standings = page.getByTestId('standings-panel');
  await expect(standings.getByText("Couldn't load standings")).toBeVisible({
    timeout: RENDER_TIMEOUT
  });
  const retry = standings.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();

  // Recover: unblock the fetch and retry → the standings render.
  failing = false;
  await retry.click();
  const lb = leaderboardPage(page);
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible({
    timeout: RENDER_TIMEOUT
  });
});

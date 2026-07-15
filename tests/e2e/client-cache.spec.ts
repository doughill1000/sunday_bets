import { expect, test, type Page } from '@playwright/test';
import { leaderboardPage } from './helpers/leaderboard-page';

/**
 * Client-side stale-while-revalidate cache for Stats / Group / Leaderboard
 * (ADR-0017, issue #330). Post-#561 the standings live on the League home (`/league`) and the
 * members list on its Members & manage subpage (`/league/manage`), reached from the League home's
 * manage entry — the cached read models (and their `/api/*` endpoints) are unchanged.
 *
 * These specs assert the *observable* cache contract rather than internals:
 *   1. Each read screen renders its content when reached by client navigation
 *      (the data comes from a cache-backed `createQuery`, not a server `load`).
 *   2. A revisit within `staleTime` is served from cache — the content paints
 *      and no new `GET /api/{route}` request is issued (no background refetch).
 *
 * All navigation is client-side (nav-link clicks from one initial full load),
 * because a full page load SSR-prefetches `initialData` and would not issue a
 * client `/api/*` request — the cache behaviour only shows on SPA navigation.
 *
 * Timeouts are generous because the local dev server compiles each route the
 * first time it is hit; CI runs a built `vite preview` where this is instant.
 */

// Absorbs the dev server's first-hit, on-demand route compilation.
const RENDER_TIMEOUT = 30_000;

/** Count `GET /api/{route}` requests (the read-route calls the cache fetchers make). */
function trackApiCalls(page: Page) {
  const counts = { stats: 0, group: 0, leaderboard: 0 };
  page.on('request', (req) => {
    if (req.method() !== 'GET') return;
    const path = new URL(req.url()).pathname;
    if (path === '/api/stats') counts.stats += 1;
    else if (path === '/api/group') counts.group += 1;
    else if (path === '/api/leaderboard') counts.leaderboard += 1;
  });
  return counts;
}

function navTo(page: Page, name: 'League' | 'Stats') {
  return page.getByTestId('primary-nav').getByRole('link', { name, exact: true }).click();
}

/** Reach the members list (group cache) via the League home's Members & manage entry. */
function navToManage(page: Page) {
  return page.getByTestId('manage-entry').click();
}

const statsHeading = (page: Page) => page.getByRole('heading', { name: 'Stats & history' });
const groupMembers = (page: Page) => page.getByRole('list', { name: 'League members' });

test('cached read routes render across client navigation', { tag: '@smoke' }, async ({ page }) => {
  // One initial full load; everything after is client-side navigation.
  const lb = leaderboardPage(page);
  await lb.goto();
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();

  // League → Stats: cache-backed query fetches and the screen renders.
  await navTo(page, 'Stats');
  await expect(statsHeading(page)).toBeVisible({ timeout: RENDER_TIMEOUT });

  // Stats → League: standings render from the cache-backed query.
  await navTo(page, 'League');
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible({
    timeout: RENDER_TIMEOUT
  });

  // League → Members & manage: members list (shareable cached data) renders.
  await navToManage(page);
  await expect(groupMembers(page)).toBeVisible({ timeout: RENDER_TIMEOUT });
});

test('revisit within staleTime serves from cache without refetching', async ({ page }) => {
  const calls = trackApiCalls(page);

  const lb = leaderboardPage(page);
  await lb.goto();
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible();

  // First client visit to Stats: a cache miss → the query fetches once.
  await navTo(page, 'Stats');
  await expect(statsHeading(page)).toBeVisible({ timeout: RENDER_TIMEOUT });
  expect(calls.stats).toBeGreaterThanOrEqual(1);
  const afterFirstVisit = calls.stats;

  // Leave to League and immediately return (well within the 45s staleTime).
  await navTo(page, 'League');
  await expect(lb.standingsTable().or(lb.standingsEmpty())).toBeVisible({
    timeout: RENDER_TIMEOUT
  });

  await navTo(page, 'Stats');
  // Served from cache: content paints right away and no new request is issued.
  await expect(statsHeading(page)).toBeVisible();
  await page.waitForTimeout(500); // let any (unwanted) background refetch surface
  expect(calls.stats).toBe(afterFirstVisit);
});

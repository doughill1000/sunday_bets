/**
 * E2E: Comments — switched off in the UI, intact in the data path (#832)
 *
 * Per-game comments are gone from `/picks`: kickoff removes a game from the page entirely, and
 * the comment surface went with it. Nothing underneath was deleted — the `comments` table, its
 * RLS policies, `/api/comments/[gameId]` and #689's reactions repoint all stay, so re-enabling
 * is one PR.
 *
 * These specs hold both halves of that claim: no comment UI renders anywhere, and a POST to the
 * untouched API still succeeds and persists. The API half is what makes "reversible in one PR"
 * a tested statement rather than an assertion in a changelog.
 *
 * The target is the graded DAL @ PHI game `global-setup.ts` seeds into the active week: its
 * kickoff is 20h past, which is what the comments read policy requires. Reusing it (rather than
 * seeding a third game of our own, as this spec used to) also keeps the active week's game count
 * — a denominator the picks specs assert on — stable no matter which files run in parallel.
 */

import { test, expect } from '@playwright/test';
import { makeServiceClient, resolveGradedGameId } from './helpers/seed';

test.use({ storageState: 'playwright/.auth/user.json' });

let gameId: string;

test.beforeAll(async () => {
  gameId = await resolveGradedGameId(makeServiceClient());
});

test('no comment UI renders on the picks board', async ({ page }) => {
  await page.goto('/picks');
  await expect(page.getByTestId('saved-counter')).toBeVisible();

  await expect(page.getByTestId('comments-section')).toHaveCount(0);
  await expect(page.getByTestId('comment-composer')).toHaveCount(0);
  await expect(page.getByTestId('comment-row')).toHaveCount(0);
});

test('the comments API still accepts a post on a kicked-off game', async ({ page }) => {
  // `page.request` shares the browser context's cookie jar, so this is the same authenticated
  // session the app would post with — the route's own `locals.user` / `locals.groupId` checks
  // and the RLS insert policy are both exercised for real.
  await page.goto('/picks');

  const body = `E2E data-path check ${Date.now()}`;
  const res = await page.request.post(`/api/comments/${gameId}`, { data: { body } });

  expect(res.status(), await res.text()).toBe(200);
  const payload = (await res.json()) as { ok: boolean; comment?: { id: string; body: string } };
  expect(payload.ok).toBe(true);
  expect(payload.comment?.body).toBe(body);

  // Persisted, not just echoed — then cleaned up so the row doesn't accumulate across runs.
  const supabase = makeServiceClient();
  const { data } = await supabase
    .from('comments')
    .select('id, body')
    .eq('id', payload.comment!.id)
    .maybeSingle();
  expect(data?.body).toBe(body);

  await supabase.from('comments').delete().eq('id', payload.comment!.id);
});

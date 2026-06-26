/**
 * E2E: Comments and Reactions
 *
 * The global setup seeds a started (past) game so the CommentsSection is visible.
 * These tests verify that: the UI renders post-kickoff, a user can post a comment,
 * and reactions can be toggled.
 *
 * Note: The seeded E2E game uses a future commence_time (to allow pick locking in
 * the picks tests). For CommentsSection to appear, the game must have already
 * started. This spec uses the Supabase service role to seed an additional past game
 * dedicated to the social feature tests, then visits the picks page.
 *
 * Because we seed server-side and rely on server-rendered data, a page reload is
 * needed after seeding to see the CommentsSection.
 */

import { test, expect } from '@playwright/test';
import { commentsSection } from './helpers/comments';
import { makeServiceClient } from './helpers/seed';

const PAST_GAME_TAG = 'e2e-comments-past-game';

// This test file requires its own seeding; it runs after auth.setup so the
// storageState is available for authenticated requests.
test.use({ storageState: 'playwright/.auth/user.json' });

test.beforeAll(async () => {
  const supabase = makeServiceClient();

  // Look up the week seeded by global-setup
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2026)
    .maybeSingle();
  if (!season) return;
  const { data: week } = await supabase
    .from('weeks')
    .select('id')
    .eq('season_id', season.id)
    .eq('week_number', 1)
    .maybeSingle();
  if (!week) return;

  const { data: teams } = await supabase.from('teams').select('id').limit(2);
  if (!teams || teams.length < 2) return;

  // Seed a past game for the comments feature, capturing its id so we can attach
  // an active line. The picks page reads the ui_games view, which only surfaces
  // games that have an active game_lines row — without one the game never reaches
  // /picks and CommentsSection (gated on started && social[g.id]) never renders.
  await supabase.from('games').delete().eq('external_game_id', PAST_GAME_TAG);
  const { data: insertedGame, error: gameErr } = await supabase
    .from('games')
    .insert({
      week_id: week.id,
      external_game_id: PAST_GAME_TAG,
      commence_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      home_team_id: teams[0].id,
      away_team_id: teams[1].id
    })
    .select('id')
    .single();
  if (gameErr || !insertedGame) return;

  // Active line (home favored) so the game appears in ui_games. afterAll deletes
  // the game by tag; the line is removed by the game_lines → games cascade.
  await supabase.from('game_lines').insert({
    game_id: insertedGame.id,
    source: 'fanduel',
    spread_team_id: teams[0].id,
    spread_value: -3.5,
    is_active_line: true,
    fetched_at: new Date().toISOString()
  });
});

test.afterAll(async () => {
  const supabase = makeServiceClient();
  await supabase.from('games').delete().eq('external_game_id', PAST_GAME_TAG);
});

test('CommentsSection is visible for a kicked-off game', async ({ page }) => {
  const comments = commentsSection(page);
  await comments.goto();
  await comments.openStartedGame();
  // Reaction buttons are rendered by CommentsSection for started games.
  await comments.expectVisible();
});

test('user can post a comment on a started game', async ({ page }) => {
  const comments = commentsSection(page);
  await comments.goto();
  await comments.openStartedGame();

  await expect(comments.commentInput()).toBeVisible({ timeout: 5000 });

  const uniqueBody = `E2E test comment ${Date.now()}`;
  await comments.commentInput().fill(uniqueBody);
  await comments.submitButton().click();

  // The comment body is real data the test typed — assert on the content itself.
  await comments.expectCommentVisible(uniqueBody);
});

test('user can toggle a reaction on a started game', async ({ page }) => {
  const comments = commentsSection(page);
  await comments.goto();
  await comments.openStartedGame();

  // Click the 👍 reaction button
  await comments.expectVisible();
  await comments.reactionButton('👍').click();

  // After toggling, the button should show a count ≥ 1
  await comments.expectReactionCount('👍', /1/);
});

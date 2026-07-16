/**
 * E2E: Comments
 *
 * The global setup seeds a started (past) game so the CommentsSection is visible.
 * These tests verify that: the UI renders post-kickoff, and a user can post a
 * comment.
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

  // Dedicated teams for the comments past-game. global-setup only seeds KC/BUF,
  // and the past game lives in the same active week 1; reusing `teams.limit(2)`
  // could grab KC/BUF and collide on uq_games_matchup (unique on week + unordered
  // team pair) — the insert would fail and the past game would never seed, taking
  // all comments specs down with it. Distinct teams make the matchup unique
  // regardless of how many teams the local DB holds.
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .upsert(
      [
        { name: 'E2E Comments Home', short_name: 'CMH' },
        { name: 'E2E Comments Away', short_name: 'CMA' }
      ],
      { onConflict: 'name' }
    )
    .select('id, short_name');
  if (teamErr || !teams || teams.length < 2) return;
  const homeTeam = teams.find((t) => t.short_name === 'CMH')!;
  const awayTeam = teams.find((t) => t.short_name === 'CMA')!;

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
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id
    })
    .select('id')
    .single();
  if (gameErr || !insertedGame) return;

  // Active line (home favored) so the game appears in ui_games. afterAll deletes
  // the game by tag; the line is removed by the game_lines → games cascade.
  await supabase.from('game_lines').insert({
    game_id: insertedGame.id,
    source: 'fanduel',
    spread_team_id: homeTeam.id,
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

test('user can react to a comment, reveal reactors, then remove the reaction', async ({ page }) => {
  const comments = commentsSection(page);
  await comments.goto();
  await comments.openStartedGame();
  await expect(comments.commentInput()).toBeVisible({ timeout: 5000 });

  // Post a fresh comment to react to (isolated from other specs by its body).
  const uniqueBody = `E2E reaction target ${Date.now()}`;
  await comments.commentInput().fill(uniqueBody);
  await comments.submitButton().click();
  await comments.expectCommentVisible(uniqueBody);

  const row = comments.rowWithText(uniqueBody);

  // No chip until someone reacts.
  await expect(comments.reactionChip(row, 'fire')).toHaveCount(0);

  // Open the picker and add 🔥 — a chip with count 1 should appear.
  await comments.reactionAdd(row).click();
  await comments.reactionPick(row, 'fire').click();
  const chip = comments.reactionChip(row, 'fire');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('1');

  // Tapping the chip reveals who reacted.
  await chip.click();
  await expect(comments.reactionReactors(row)).toBeVisible();

  // Toggling 🔥 off via the picker removes the chip.
  await comments.reactionAdd(row).click();
  await comments.reactionPick(row, 'fire').click();
  await expect(comments.reactionChip(row, 'fire')).toHaveCount(0);
});

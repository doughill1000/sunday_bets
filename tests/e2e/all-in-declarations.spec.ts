import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeServiceClient, resolveSeededGameId, resetPicksForGame } from './helpers/seed';
import { E2E_MULTIGROUP_USER } from './test-user';

// ADR-0023: a locked All-In (weight='A') is revealed to co-members on the picks
// board BEFORE kickoff — the one place a group member's pick is visible pre-game.
//
// The default authenticated user (E2E_USER) and the E2E_MULTIGROUP_USER are both
// members of the original group; the seeded KC @ BUF game is pre-kickoff. We
// inject the co-member's locked All-In via the service client (bypassing RLS and
// the one-per-week cap — we're seeding state, not exercising lock_pick) and
// assert the declarations board surfaces it to E2E_USER.

const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

let supabase: SupabaseClient;
let gameId: string;
let coMemberId: string;

test.beforeAll(async () => {
  supabase = makeServiceClient();
  gameId = await resolveSeededGameId(supabase);

  const { data: list } = await supabase.auth.admin.listUsers();
  const coMember = list?.users.find((u) => u.email === E2E_MULTIGROUP_USER.email);
  if (!coMember) throw new Error('all-in-declarations e2e: multigroup co-member not found');
  coMemberId = coMember.id;
});

test.beforeEach(async () => {
  await resetPicksForGame(supabase, gameId);
});

test.afterAll(async () => {
  await resetPicksForGame(supabase, gameId);
});

test("a co-member's locked All-In is revealed on the board pre-kickoff", async ({ page }) => {
  const { data: game } = await supabase
    .from('games')
    .select('home_team_id')
    .eq('id', gameId)
    .single();
  const pickedTeamId = game!.home_team_id; // KC (home), the -3.5 favorite

  const { error } = await supabase.from('picks').insert({
    group_id: ORIGINAL_GROUP_ID,
    user_id: coMemberId,
    game_id: gameId,
    picked_team_id: pickedTeamId,
    weight: 'A',
    locked_at: new Date().toISOString(),
    locked_by: coMemberId,
    locked_spread_team_id: pickedTeamId,
    locked_spread_value: -3.5
  });
  if (error) throw new Error('seed co-member All-In: ' + error.message);

  await page.goto('/picks');

  const board = page.getByTestId('all-in-declarations');
  await expect(board).toBeVisible();

  const entry = board
    .getByTestId('all-in-entry')
    .filter({ hasText: E2E_MULTIGROUP_USER.displayName });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText('KC');
  await expect(entry).toContainText('All-In');
});

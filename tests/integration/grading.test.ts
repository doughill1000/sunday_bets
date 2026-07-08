import { describe, test, expect, beforeAll } from 'vitest';
import { createSupaClient } from './_helpers';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureTeams,
  ensureSeasonAndWeek,
  ensureSettings
} from './fixtures/db';

const supabase = createSupaClient();
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

describe('Grading Integration Flow', () => {
  let testData: {
    gameId: string;
    weekId: number;
    chiefsId: number;
    billsId: number;
    user1Id: string;
    user2Id: string;
    user3Id: string;
  };

  beforeAll(async () => {
    await ensureCoreTestUsers(supabase, true);
    await ensureTeams(supabase);
    // A live (post-2025) scratch season: pre-2025 seasons are grading_locked
    // (ADR-0024) and grade_game is a no-op on them.
    const { weekId } = await ensureSeasonAndWeek(supabase, 2098, 1);
    await ensureSettings(supabase);

    await supabase.from('pick_settlement').delete().eq('game_id', 'test-grading-game-123');
    await supabase.from('picks').delete().eq('game_id', 'test-grading-game-123');
    await supabase.from('games').delete().eq('external_game_id', 'test-grading-game-123');

    const { data: teams } = await supabase.from('teams').select('id, name');
    const { data: users } = await supabase.from('users').select('id, display_name');

    if (!teams || teams.length < 2) throw new Error('Expected at least two teams');
    if (!users || users.length < 3) throw new Error('Expected at least three users');

    const chiefsId = teams.find((t) => t.name === 'Kansas City Chiefs')!.id;
    const billsId = teams.find((t) => t.name === 'Buffalo Bills')!.id;
    const user1Id = users.find((u) => u.display_name === TEST_USERS[0].display)!.id;
    const user2Id = users.find((u) => u.display_name === TEST_USERS[1].display)!.id;
    const user3Id = users.find((u) => u.display_name === TEST_USERS[2].display)!.id;

    const { error: membershipErr } = await supabase.from('group_memberships').upsert(
      [
        { group_id: ORIGINAL_GROUP_ID, user_id: user1Id, role: 'member' },
        { group_id: ORIGINAL_GROUP_ID, user_id: user2Id, role: 'member' },
        { group_id: ORIGINAL_GROUP_ID, user_id: user3Id, role: 'member' }
      ],
      { onConflict: 'group_id,user_id' }
    );
    if (membershipErr) throw new Error(`Failed to upsert memberships: ${membershipErr.message}`);

    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: chiefsId,
        away_team_id: billsId,
        commence_time: new Date().toISOString(),
        external_game_id: 'test-grading-game-123'
      })
      .select('id')
      .single();
    if (gameErr) throw new Error(`Failed to create game: ${gameErr.message}`);

    const gameId = game.id;
    const lockedAt = new Date().toISOString();

    const { error: pickErr } = await supabase.from('picks').insert([
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: user1Id,
        game_id: gameId,
        picked_team_id: chiefsId,
        locked_spread_team_id: chiefsId,
        locked_spread_value: 6.5,
        weight: 'H',
        locked_by: user1Id,
        locked_at: lockedAt
      },
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: user2Id,
        game_id: gameId,
        picked_team_id: billsId,
        locked_spread_team_id: chiefsId,
        locked_spread_value: 6.5,
        weight: 'M',
        locked_by: user2Id,
        locked_at: lockedAt
      }
    ]);
    if (pickErr) throw new Error(`Failed to insert picks: ${pickErr.message}`);

    const { error: updateErr } = await supabase
      .from('games')
      .update({ final_scores: { home: 34, away: 24 } })
      .eq('id', gameId);
    if (updateErr) throw new Error(`Failed to update score: ${updateErr.message}`);

    testData = { gameId, weekId, chiefsId, billsId, user1Id, user2Id, user3Id };
  });

  test('should correctly grade a game with winning, losing, and missed picks', async () => {
    const { error: rpcError } = await supabase.rpc('grade_game', { p_game_id: testData.gameId });
    expect(rpcError).toBeNull();

    // Scope to the group under test: grade_game also writes cross-group "missed"
    // settlements for every other group/player that exists for this game (other
    // integration fixtures seed additional groups), so a game_id-only query would
    // pick those up too.
    const { data: settlements, error: settlementErr } = await supabase
      .from('pick_settlement')
      .select('*')
      .eq('game_id', testData.gameId)
      .eq('group_id', ORIGINAL_GROUP_ID);
    expect(settlementErr).toBeNull();
    expect(settlements).toHaveLength(3);

    const winnerSettlement = settlements!.find((s) => s.user_id === testData.user1Id)!;
    const loserSettlement = settlements!.find((s) => s.user_id === testData.user2Id)!;
    const missedSettlement = settlements!.find((s) => s.user_id === testData.user3Id)!;

    expect(winnerSettlement.outcome).toBe('win');
    expect(winnerSettlement.points_delta).toBe(5);

    expect(loserSettlement.outcome).toBe('loss');
    expect(loserSettlement.points_delta).toBe(-3);

    expect(missedSettlement.outcome).toBe('missed');
    expect(missedSettlement.points_delta).toBe(-1);
  });
});

// Reconcile sweep (#433): a week with finals but no settlement (missed during the cron's
// normal processing window) is surfaced by find_unsettled_weeks() and healed by grading
// it — the same building blocks the cron's sweep loop uses — with no recap/AI fan-out.
describe('Grade-cron reconcile sweep', () => {
  const SWEEP_SEASON_YEAR = 2099;
  const SWEEP_WEEK_NUMBER = 5;
  const SWEEP_GAME_EXT = 'test-reconcile-sweep-456';
  let weekId: number;
  let gameId: string;
  let pickerId: string;
  let skipperId: string;

  beforeAll(async () => {
    await ensureCoreTestUsers(supabase, true);
    await ensureTeams(supabase);
    // A live (post-2025) scratch season/week: pre-2025 seasons are grading_locked
    // (ADR-0024) and excluded from the sweep by construction.
    const ids = await ensureSeasonAndWeek(supabase, SWEEP_SEASON_YEAR, SWEEP_WEEK_NUMBER);
    weekId = ids.weekId;
    await ensureSettings(supabase);

    // Clean any prior run of this fixture so the strand is real (no settlement rows).
    await supabase.from('pick_settlement').delete().eq('game_id', SWEEP_GAME_EXT);
    await supabase.from('picks').delete().eq('game_id', SWEEP_GAME_EXT);
    await supabase.from('games').delete().eq('external_game_id', SWEEP_GAME_EXT);
    await supabase
      .from('ai_recaps')
      .delete()
      .eq('season_year', SWEEP_SEASON_YEAR)
      .eq('week_number', SWEEP_WEEK_NUMBER);

    const { data: teams } = await supabase.from('teams').select('id, name');
    const { data: users } = await supabase.from('users').select('id, display_name');
    if (!teams || teams.length < 2) throw new Error('Expected at least two teams');
    if (!users || users.length < 3) throw new Error('Expected at least three users');

    const chiefsId = teams.find((t) => t.name === 'Kansas City Chiefs')!.id;
    const billsId = teams.find((t) => t.name === 'Buffalo Bills')!.id;
    pickerId = users.find((u) => u.display_name === TEST_USERS[0].display)!.id;
    skipperId = users.find((u) => u.display_name === TEST_USERS[2].display)!.id;

    const { error: membershipErr } = await supabase.from('group_memberships').upsert(
      [
        { group_id: ORIGINAL_GROUP_ID, user_id: pickerId, role: 'member' },
        { group_id: ORIGINAL_GROUP_ID, user_id: skipperId, role: 'member' }
      ],
      { onConflict: 'group_id,user_id' }
    );
    if (membershipErr) throw new Error(`Failed to upsert memberships: ${membershipErr.message}`);

    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: chiefsId,
        away_team_id: billsId,
        commence_time: new Date().toISOString(),
        external_game_id: SWEEP_GAME_EXT,
        final_scores: { home: 34, away: 24 }
      })
      .select('id')
      .single();
    if (gameErr) throw new Error(`Failed to create game: ${gameErr.message}`);
    gameId = game.id;

    // Picker picks the Chiefs -6.5 (34-24 = +3.5 cover -> win). Skipper makes no pick.
    const { error: pickErr } = await supabase.from('picks').insert([
      {
        group_id: ORIGINAL_GROUP_ID,
        user_id: pickerId,
        game_id: gameId,
        picked_team_id: chiefsId,
        locked_spread_team_id: chiefsId,
        locked_spread_value: 6.5,
        weight: 'H',
        locked_by: pickerId,
        locked_at: new Date().toISOString()
      }
    ]);
    if (pickErr) throw new Error(`Failed to insert pick: ${pickErr.message}`);
  });

  test('surfaces the stranded week, settles it, and is a no-op once healed', async () => {
    // The week has finals but no settlement -> find_unsettled_weeks must surface it.
    const { data: before, error: beforeErr } = await supabase.rpc('find_unsettled_weeks');
    expect(beforeErr).toBeNull();
    expect((before ?? []).some((w: { id: number }) => w.id === weekId)).toBe(true);

    // Sweep = grade the surfaced week (mirrors the cron's settle-only path).
    const { error: gradeErr } = await supabase.rpc('grade_week', { p_week_id: weekId });
    expect(gradeErr).toBeNull();

    const { data: settlements, error: settleErr } = await supabase
      .from('pick_settlement')
      .select('*')
      .eq('game_id', gameId)
      .eq('group_id', ORIGINAL_GROUP_ID);
    expect(settleErr).toBeNull();

    const pickerSettlement = settlements!.find((s) => s.user_id === pickerId)!;
    const skipperSettlement = settlements!.find((s) => s.user_id === skipperId)!;
    expect(pickerSettlement.outcome).toBe('win');
    expect(skipperSettlement.outcome).toBe('missed');
    expect(skipperSettlement.points_delta).toBe(-1);

    // No fan-out: the sweep settles picks only, never generating an AI recap.
    const { data: recaps, error: recapErr } = await supabase
      .from('ai_recaps')
      .select('id')
      .eq('season_year', SWEEP_SEASON_YEAR)
      .eq('week_number', SWEEP_WEEK_NUMBER);
    expect(recapErr).toBeNull();
    expect(recaps ?? []).toHaveLength(0);

    // Healed: the week is no longer surfaced (true no-op on the next tick).
    const { data: after, error: afterErr } = await supabase.rpc('find_unsettled_weeks');
    expect(afterErr).toBeNull();
    expect((after ?? []).some((w: { id: number }) => w.id === weekId)).toBe(false);
  });
});

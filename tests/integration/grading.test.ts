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
    const { weekId } = await ensureSeasonAndWeek(supabase, 2024, 1);
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

    const { data: settlements, error: settlementErr } = await supabase
      .from('pick_settlement')
      .select('*')
      .eq('game_id', testData.gameId);
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

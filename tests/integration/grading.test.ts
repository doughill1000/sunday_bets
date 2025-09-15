import { describe, test, expect, beforeAll } from 'vitest';
import { supabase } from './_helpers';

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

  // ARRANGE: Set up all necessary data before running the test.
  beforeAll(async () => {
    // Debug: Check what's actually in the database
    const { data: allTeams } = await supabase.from('teams').select('*');
    const { data: allUsers } = await supabase.from('users').select('*');
    const { data: allWeeks } = await supabase.from('weeks').select('*');
    
    console.log('All teams:', allTeams);
    console.log('All users:', allUsers);
    console.log('All weeks:', allWeeks);

    // Fetch IDs from pre-seeded data
    const { data: teams } = await supabase.from('teams').select('id, name').in('name', ['Kansas City Chiefs', 'Buffalo Bills']);
    const { data: users } = await supabase.from('users').select('id, email').in('email', ['test1@example.com', 'test2@example.com', 'test3@example.com']);
    const { data: week } = await supabase.from('weeks').select('id').eq('week_number', 1).single();

    console.log('Found teams:', teams);
    console.log('Found users:', users);
    console.log('Found week:', week);

    if (!teams || !users || !week || teams.length < 2 || users.length < 3) {
      throw new Error('Seeding failed. Could not find necessary teams, users, or week.');
    }

    const chiefsId = teams.find(t => t.name === 'Kansas City Chiefs')!.id;
    const billsId = teams.find(t => t.name === 'Buffalo Bills')!.id;
    const user1Id = users.find(u => u.email === 'test1@example.com')!.id;
    const user2Id = users.find(u => u.email === 'test2@example.com')!.id;
    const user3Id = users.find(u => u.email === 'test3@example.com')!.id;

    // 1. Create a game for our test
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        week_id: week.id,
        home_team_id: chiefsId,
        away_team_id: billsId,
        game_ts: new Date().toISOString(),
        external_game_id: 'test-grading-game-123'
      })
      .select('id')
      .single();

    if (gameErr) throw new Error(`Failed to create game: ${gameErr.message}`);
    const gameId = game.id;

    // 2. Create picks for the game
    const picksToInsert = [
      // User 1: Winning pick (Chiefs -6.5, they win by 10)
      { user_id: user1Id, game_id: gameId, picked_team_id: chiefsId, locked_spread_team_id: chiefsId, locked_spread_value: -6.5, weight: 'H' },
      // User 2: Losing pick (Bills +6.5, they lose by 10)
      { user_id: user2Id, game_id: gameId, picked_team_id: billsId, locked_spread_team_id: chiefsId, locked_spread_value: -6.5, weight: 'M' }
      // User 3 makes no pick (missed)
    ];
    const { error: pickErr } = await supabase.from('picks').insert(picksToInsert);
    if (pickErr) throw new Error(`Failed to insert picks: ${pickErr.message}`);

    // 3. Update the game with a final score
    const { error: updateErr } = await supabase
      .from('games')
      .update({ final_scores: { home: 34, away: 24 } }) // Chiefs win by 10
      .eq('id', gameId);
    if (updateErr) throw new Error(`Failed to update score: ${updateErr.message}`);

    testData = { gameId, weekId: week.id, chiefsId, billsId, user1Id, user2Id, user3Id };
  });

  test('should correctly grade a game with winning, losing, and missed picks', async () => {
    // ACT: Call the RPC function to grade the game
    const { error: rpcError } = await supabase.rpc('grade_game', { p_game_id: testData.gameId });
    expect(rpcError).toBeNull();

    // ASSERT: Verify the results in the pick_settlement table
    const { data: settlements, error: settlementErr } = await supabase
      .from('pick_settlement')
      .select('*')
      .eq('game_id', testData.gameId);

    expect(settlementErr).toBeNull();
    expect(settlements).toHaveLength(3);

    // 1. Check the winning pick
    const winnerSettlement = settlements!.find(s => s.user_id === testData.user1Id);
    expect(winnerSettlement).toBeDefined();
    expect(winnerSettlement!.outcome).toBe('win');
    expect(winnerSettlement!.points_delta).toBe(5); // H weight = 5 points

    // 2. Check the losing pick
    const loserSettlement = settlements!.find(s => s.user_id === testData.user2Id);
    expect(loserSettlement).toBeDefined();
    expect(loserSettlement!.outcome).toBe('loss');
    expect(loserSettlement!.points_delta).toBe(-3); // M weight = 3 points

    // 3. Check the missed pick
    const missedSettlement = settlements!.find(s => s.user_id === testData.user3Id);
    expect(missedSettlement).toBeDefined();
    expect(missedSettlement!.outcome).toBe('missed');
    expect(missedSettlement!.points_delta).toBe(-1); // Default missed penalty
  });
});
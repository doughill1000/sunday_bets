import { describe, test, expect, beforeAll } from 'vitest';
import { createSupaClient } from './_helpers';

const supabase = createSupaClient();

async function seed() {
  console.log('Seeding test data...');
  // 1. Insert auth.users rows (triggers will mirror into public.users)
  // NOTE: direct inserts into `auth.users` are only allowed with service role.
  await supabase.from('auth.users' as any).insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      instance_id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test1@example.com',
      encrypted_password: 'password123', // Supabase will hash if you use admin api; raw insert expects crypt()
      email_confirmed_at: new Date().toISOString(),
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { display_name: 'test1' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      instance_id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test2@example.com',
      encrypted_password: 'password123',
      email_confirmed_at: new Date().toISOString(),
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { display_name: 'test2' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      instance_id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test3@example.com',
      encrypted_password: 'password123',
      email_confirmed_at: new Date().toISOString(),
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { display_name: 'test3' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  console.log('Inserted auth.users');

  try {
    // 2. Mirror manually into public.users (in case trigger doesn’t fire)
    await supabase.from('users').upsert([
      { id: '00000000-0000-0000-0000-000000000001', display_name: 'test1', role: 'player' },
      { id: '00000000-0000-0000-0000-000000000002', display_name: 'test2', role: 'player' },
      { id: '00000000-0000-0000-0000-000000000003', display_name: 'test3', role: 'player' }
    ]);
    console.log('Inserted public.users');
  } catch (e) {
    console.error('Error inserting into public.users:', e);
  }

  // 3. Elevate one user to admin
  await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', '00000000-0000-0000-0000-000000000001');

  // 4. Insert test teams
  await supabase.from('teams').insert([
    { name: 'Kansas City Chiefs', short_name: 'KC' },
    { name: 'Buffalo Bills', short_name: 'BUF' }
  ]);

  // 5. Insert season + week
  const { data: season } = await supabase
    .from('seasons')
    .insert({ year: 2024 })
    .select('id')
    .single();

  if (season) {
    await supabase.from('weeks').insert({
      season_id: season.id,
      week_number: 1,
      start_ts: '2024-09-01T00:00:00Z',
      end_ts: '2024-09-08T00:00:00Z'
    });
  }

  // 6. Insert settings row (id=true is the single-row PK)
  await supabase.from('settings').upsert({
    id: true,
    odds_api_monthly_cap: 500,
    odds_api_calls_used_current_month: 0,
    reset_on: null
    // missed_pick_penalty is stored in weeks/seasons now; if you still want a default, add column.
  });

  console.log('Seeding complete');
}

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
    await seed().catch(console.error);

    // Clean up any existing test data first
    await supabase.from('pick_settlement').delete().eq('game_id', 'test-grading-game-123');
    await supabase.from('picks').delete().eq('game_id', 'test-grading-game-123');
    await supabase.from('games').delete().eq('external_game_id', 'test-grading-game-123');

    // Fetch IDs from pre-seeded data
    const { data: teams } = await supabase.from('teams').select('id, name');
    const { data: users } = await supabase.from('users').select('id, display_name');
    const { data: week } = await supabase.from('weeks').select('id').single();

    console.log('Teams:', teams);
    console.log('Users:', users);
    console.log('Week:', week);

    if (!teams || !users || !week || teams.length < 2 || users.length < 3) {
      throw new Error('Seeding failed. Could not find necessary teams, users, or week.');
    }

    const chiefsId = teams.find((t) => t.name === 'Kansas City Chiefs')!.id;
    const billsId = teams.find((t) => t.name === 'Buffalo Bills')!.id;
    const user1Id = users.find((u) => u.display_name === 'test1')!.id;
    const user2Id = users.find((u) => u.display_name === 'test2')!.id;
    const user3Id = users.find((u) => u.display_name === 'test3')!.id;

    // 1. Create a game for our test
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        week_id: week.id,
        home_team_id: chiefsId,
        away_team_id: billsId,
        commence_time: new Date().toISOString(),
        external_game_id: 'test-grading-game-123'
      })
      .select('id')
      .single();

    if (gameErr) throw new Error(`Failed to create game: ${gameErr.message}`);
    const gameId = game.id;

    // 2. Create picks for the game
    const picksToInsert = [
      // User 1: Winning pick (Chiefs -6.5, they win by 10)
      {
        user_id: user1Id,
        game_id: gameId,
        picked_team_id: chiefsId,
        locked_spread_team_id: chiefsId,
        locked_spread_value: -6.5,
        weight: 'H' as const,
        locked_by: user1Id // Added this required field
      },
      // User 2: Losing pick (Bills +6.5, they lose by 10)
      {
        user_id: user2Id,
        game_id: gameId,
        picked_team_id: billsId,
        locked_spread_team_id: chiefsId,
        locked_spread_value: -6.5,
        weight: 'M' as const,
        locked_by: user2Id // Added this required field
      }
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
    const winnerSettlement = settlements!.find((s) => s.user_id === testData.user1Id);
    expect(winnerSettlement).toBeDefined();
    expect(winnerSettlement!.outcome).toBe('win');
    expect(winnerSettlement!.points_delta).toBe(5); // H weight = 5 points

    // 2. Check the losing pick
    const loserSettlement = settlements!.find((s) => s.user_id === testData.user2Id);
    expect(loserSettlement).toBeDefined();
    expect(loserSettlement!.outcome).toBe('loss');
    expect(loserSettlement!.points_delta).toBe(-3); // M weight = 3 points

    // 3. Check the missed pick
    const missedSettlement = settlements!.find((s) => s.user_id === testData.user3Id);
    expect(missedSettlement).toBeDefined();
    expect(missedSettlement!.outcome).toBe('missed');
    expect(missedSettlement!.points_delta).toBe(-1); // Default missed penalty
  });
});

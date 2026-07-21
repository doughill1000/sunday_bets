import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureSeasonAndWeek,
  clearWeekGames
} from './fixtures/db';

// ADR-0019 counts-only status carve-out (#388): the picks_status_board RPC exposes
// per-active-member picked COUNTS for a group + week, pre-kickoff, while base-table
// picks RLS keeps pick content sealed. This suite proves, against a live local
// Supabase, that a co-member's count is visible pre-kickoff (the whole point) yet the
// underlying pick rows still are not, and that the is_member() gate scopes per group.
const admin = createServiceClient();
const GROUP_1 = '00000000-0000-4000-7777-000000000001';
const GROUP_2 = '00000000-0000-4000-7777-000000000002';
const ts = Date.now();
const EXT_G1 = `board-g1-${ts}`;
const EXT_G2 = `board-g2-${ts}`;
const TEAM_H1 = `BoardH1-${ts}`;
const TEAM_A1 = `BoardA1-${ts}`;
const TEAM_H2 = `BoardH2-${ts}`;
const TEAM_A2 = `BoardA2-${ts}`;

describe('picks_status_board RPC (ADR-0019 counts-only carve-out)', () => {
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let weekId: number;
  let game1Id: string;
  let game2Id: string;

  beforeAll(async () => {
    await ensureCoreTestUsers(admin, false);
    ({ weekId } = await ensureSeasonAndWeek(admin, 2144, 3));
    // Guarantee exactly the two games this suite seeds count toward games_available.
    await clearWeekGames(admin, weekId);

    userAId = TEST_USERS[0].id;
    userBId = TEST_USERS[1].id;
    userCId = TEST_USERS[2].id;

    const { data: teams, error: tErr } = await admin
      .from('teams')
      .insert([
        { name: TEAM_H1, short_name: `H1${ts}`.slice(0, 12) },
        { name: TEAM_A1, short_name: `A1${ts}`.slice(0, 12) },
        { name: TEAM_H2, short_name: `H2${ts}`.slice(0, 12) },
        { name: TEAM_A2, short_name: `A2${ts}`.slice(0, 12) }
      ])
      .select('id, name');
    if (tErr) throw tErr;
    const h1 = teams!.find((t) => t.name === TEAM_H1)!.id as number;
    const a1 = teams!.find((t) => t.name === TEAM_A1)!.id as number;
    const h2 = teams!.find((t) => t.name === TEAM_H2)!.id as number;
    const a2 = teams!.find((t) => t.name === TEAM_A2)!.id as number;

    await admin.from('groups').upsert([
      { id: GROUP_1, name: 'Board Test Group 1' },
      { id: GROUP_2, name: 'Board Test Group 2' }
    ]);
    // A + B active in group 1; C active in group 2 (a non-member of group 1).
    await admin.from('group_memberships').upsert([
      { group_id: GROUP_1, user_id: userAId, role: 'member' },
      { group_id: GROUP_1, user_id: userBId, role: 'member' },
      { group_id: GROUP_2, user_id: userCId, role: 'member' }
    ]);

    // Two FUTURE (pre-kickoff) games => games_available = 2.
    const futureKickoff = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: g1, error: g1Err } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: h1,
        away_team_id: a1,
        external_game_id: EXT_G1,
        commence_time: futureKickoff
      })
      .select('id')
      .single();
    if (g1Err) throw g1Err;
    game1Id = g1!.id as string;

    const { data: g2, error: g2Err } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: h2,
        away_team_id: a2,
        external_game_id: EXT_G2,
        commence_time: futureKickoff
      })
      .select('id')
      .single();
    if (g2Err) throw g2Err;
    game2Id = g2!.id as string;

    const now = new Date().toISOString();
    // A locks 1 of 2 (game 1) in group 1; B locks 2 of 2 (games 1 + 2) in group 1.
    await admin.from('picks').insert([
      {
        group_id: GROUP_1,
        user_id: userAId,
        game_id: game1Id,
        picked_team_id: h1,
        weight: 'M',
        locked_at: now,
        locked_spread_team_id: h1,
        locked_spread_value: 3.5,
        locked_by: userAId
      },
      {
        group_id: GROUP_1,
        user_id: userBId,
        game_id: game1Id,
        picked_team_id: h1,
        weight: 'M',
        locked_at: now,
        locked_spread_team_id: h1,
        locked_spread_value: 3.5,
        locked_by: userBId
      },
      {
        group_id: GROUP_1,
        user_id: userBId,
        game_id: game2Id,
        picked_team_id: h2,
        weight: 'M',
        locked_at: now,
        locked_spread_team_id: h2,
        locked_spread_value: 3.5,
        locked_by: userBId
      }
    ]);
  });

  afterAll(async () => {
    await admin.from('picks').delete().in('game_id', [game1Id, game2Id]);
    await admin.from('games').delete().in('external_game_id', [EXT_G1, EXT_G2]);
    await admin.from('teams').delete().in('name', [TEAM_H1, TEAM_A1, TEAM_H2, TEAM_A2]);
    await admin
      .from('group_memberships')
      .delete()
      .in('group_id', [GROUP_1, GROUP_2])
      .in('user_id', [userAId, userBId, userCId]);
    await admin.from('groups').delete().in('id', [GROUP_1, GROUP_2]);
  });

  it('a co-member sees another member picked count pre-kickoff (2/2, complete)', async () => {
    const asA = createUserClient(userAId);
    const { data, error } = await asA.rpc('picks_status_board', {
      p_group_id: GROUP_1,
      p_week_id: weekId
    });
    expect(error).toBeNull();
    const bRow = data!.find((r) => r.user_id === userBId);
    expect(bRow).toBeDefined();
    expect(bRow!.picks_made).toBe(2);
    expect(bRow!.games_available).toBe(2);
    expect(bRow!.is_complete).toBe(true);
  });

  it('the caller sees their own count (1/2, not complete)', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA.rpc('picks_status_board', {
      p_group_id: GROUP_1,
      p_week_id: weekId
    });
    const aRow = data!.find((r) => r.user_id === userAId);
    expect(aRow).toBeDefined();
    expect(aRow!.picks_made).toBe(1);
    expect(aRow!.games_available).toBe(2);
    expect(aRow!.is_complete).toBe(false);
  });

  it('the roster is exactly the active members of the group', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA.rpc('picks_status_board', {
      p_group_id: GROUP_1,
      p_week_id: weekId
    });
    const ids = (data ?? []).map((r) => r.user_id).sort();
    expect(ids).toEqual([userAId, userBId].sort());
  });

  it('base-table picks RLS is untouched: A cannot read B pick rows pre-kickoff', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA
      .from('picks')
      .select('id')
      .eq('group_id', GROUP_1)
      .eq('user_id', userBId);
    // The board exposed B's count, but the underlying pick rows stay sealed.
    expect(data).toHaveLength(0);
  });

  it('a member of group 1 sees an empty board for group 2', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA.rpc('picks_status_board', {
      p_group_id: GROUP_2,
      p_week_id: weekId
    });
    expect(data).toHaveLength(0);
  });

  it('a non-member of group 1 sees an empty board', async () => {
    const asC = createUserClient(userCId);
    const { data } = await asC.rpc('picks_status_board', {
      p_group_id: GROUP_1,
      p_week_id: weekId
    });
    expect(data).toHaveLength(0);
  });
});

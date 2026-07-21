import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import { TEST_USERS, ensureCoreTestUsers, ensureSeasonAndWeek } from './fixtures/db';

const admin = createServiceClient();
const GROUP_ID_1 = '00000000-0000-4000-8888-000000000001';
const GROUP_ID_2 = '00000000-0000-4000-8888-000000000002';
const ts = Date.now();
const EXT_PAST = `reveal-past-${ts}`;
const EXT_FUTURE = `reveal-future-${ts}`;
// Unique team names to avoid matchup constraint conflicts with other test runs
const TEAM_HOME_PAST = `RevealHP-${ts}`;
const TEAM_AWAY_PAST = `RevealAP-${ts}`;
const TEAM_HOME_FUTURE = `RevealHF-${ts}`;
const TEAM_AWAY_FUTURE = `RevealAF-${ts}`;

describe('picks reveal after kickoff (picks_group_view RLS)', () => {
  let userAId: string;
  let userBId: string;
  let pastGameId: string;
  let futureGameId: string;
  let weekId: number;
  let homePastId: number;
  let awayPastId: number;
  let homeFutureId: number;

  beforeAll(async () => {
    await ensureCoreTestUsers(admin, false);
    ({ weekId } = await ensureSeasonAndWeek(admin, 2025, 9));

    // Insert four unique teams so neither game shares a matchup pair
    const { data: insertedTeams, error: tErr } = await admin
      .from('teams')
      .insert([
        { name: TEAM_HOME_PAST, short_name: `HP${ts}` },
        { name: TEAM_AWAY_PAST, short_name: `AP${ts}` },
        { name: TEAM_HOME_FUTURE, short_name: `HF${ts}` },
        { name: TEAM_AWAY_FUTURE, short_name: `AF${ts}` }
      ])
      .select('id, name');
    if (tErr) throw tErr;
    homePastId = insertedTeams!.find((t) => t.name === TEAM_HOME_PAST)!.id as number;
    awayPastId = insertedTeams!.find((t) => t.name === TEAM_AWAY_PAST)!.id as number;
    homeFutureId = insertedTeams!.find((t) => t.name === TEAM_HOME_FUTURE)!.id as number;
    const awayFutureId = insertedTeams!.find((t) => t.name === TEAM_AWAY_FUTURE)!.id as number;

    userAId = TEST_USERS[0].id;
    userBId = TEST_USERS[1].id;

    // Ensure groups
    await admin.from('groups').upsert([
      { id: GROUP_ID_1, name: 'Reveal Test Group 1' },
      { id: GROUP_ID_2, name: 'Reveal Test Group 2' }
    ]);

    // User A and B in group 1; user B also in group 2 (for cross-group test)
    await admin.from('group_memberships').upsert([
      { group_id: GROUP_ID_1, user_id: userAId, role: 'member' },
      { group_id: GROUP_ID_1, user_id: userBId, role: 'member' },
      { group_id: GROUP_ID_2, user_id: userBId, role: 'member' }
    ]);

    // Past game (kickoff happened 2 hours ago) — unique matchup: homePast vs awayPast
    const pastKickoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: pastGame, error: pgErr } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: homePastId,
        away_team_id: awayPastId,
        external_game_id: EXT_PAST,
        commence_time: pastKickoff
      })
      .select('id')
      .single();
    if (pgErr) throw pgErr;
    pastGameId = pastGame!.id as string;

    // Future game (kickoff 2 days from now) — unique matchup: homeFuture vs awayFuture
    const futureKickoff = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: futureGame, error: fgErr } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: homeFutureId,
        away_team_id: awayFutureId,
        external_game_id: EXT_FUTURE,
        commence_time: futureKickoff
      })
      .select('id')
      .single();
    if (fgErr) throw fgErr;
    futureGameId = futureGame!.id as string;

    const now = new Date().toISOString();

    // User B's pick for the past game (group 1) — should be revealed to A
    await admin.from('picks').insert({
      group_id: GROUP_ID_1,
      user_id: userBId,
      game_id: pastGameId,
      picked_team_id: homePastId,
      weight: 'H',
      locked_at: now,
      locked_spread_team_id: homePastId,
      locked_spread_value: 6.5,
      locked_by: userBId
    });

    // User B's pick for the future game (group 1) — should NOT be revealed to A
    await admin.from('picks').insert({
      group_id: GROUP_ID_1,
      user_id: userBId,
      game_id: futureGameId,
      picked_team_id: homeFutureId,
      weight: 'M',
      locked_at: now,
      locked_spread_team_id: homeFutureId,
      locked_spread_value: 6.5,
      locked_by: userBId
    });

    // User B's pick in group 2 for the past game — cross-group, should never be visible to A
    await admin.from('picks').insert({
      group_id: GROUP_ID_2,
      user_id: userBId,
      game_id: pastGameId,
      picked_team_id: awayPastId,
      weight: 'L',
      locked_at: now,
      locked_spread_team_id: homePastId,
      locked_spread_value: 6.5,
      locked_by: userBId
    });
  });

  afterAll(async () => {
    await admin.from('picks').delete().in('game_id', [pastGameId, futureGameId]);
    await admin.from('games').delete().in('external_game_id', [EXT_PAST, EXT_FUTURE]);
    await admin
      .from('teams')
      .delete()
      .in('name', [TEAM_HOME_PAST, TEAM_AWAY_PAST, TEAM_HOME_FUTURE, TEAM_AWAY_FUTURE]);
    await admin
      .from('group_memberships')
      .delete()
      .in('group_id', [GROUP_ID_1, GROUP_ID_2])
      .in('user_id', [userAId, userBId]);
    await admin.from('groups').delete().in('id', [GROUP_ID_1, GROUP_ID_2]);
  });

  it('user A cannot read user B pick for future (pre-kickoff) game via picks table', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA
      .from('picks')
      .select('id')
      .eq('group_id', GROUP_ID_1)
      .eq('user_id', userBId)
      .eq('game_id', futureGameId);
    expect(data).toHaveLength(0);
  });

  it('user A can read user B pick for past (post-kickoff) game via picks table', async () => {
    const asA = createUserClient(userAId);
    const { data, error } = await asA
      .from('picks')
      .select('weight')
      .eq('group_id', GROUP_ID_1)
      .eq('user_id', userBId)
      .eq('game_id', pastGameId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].weight).toBe('H');
  });

  it('user A cannot read user B pick from group 2 (cross-group) even after kickoff', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA
      .from('picks')
      .select('id')
      .eq('group_id', GROUP_ID_2)
      .eq('user_id', userBId)
      .eq('game_id', pastGameId);
    expect(data).toHaveLength(0);
  });

  it('picks_group_view shows only started-game picks within own group', async () => {
    const asA = createUserClient(userAId);
    const { data, error } = await asA
      .from('picks_group_view')
      .select('user_id, game_id, weight')
      .eq('group_id', GROUP_ID_1);
    expect(error).toBeNull();
    // Only user B's past-game pick is in the view (started game, same group)
    // User A has no picks in this group, User B's future pick is excluded
    const bPastPick = data?.find((r) => r.user_id === userBId && r.game_id === pastGameId);
    expect(bPastPick).toBeDefined();
    expect(bPastPick?.weight).toBe('H');

    const bFuturePick = data?.find((r) => r.user_id === userBId && r.game_id === futureGameId);
    expect(bFuturePick).toBeUndefined();
  });

  it('picks_group_view excludes cross-group picks', async () => {
    const asA = createUserClient(userAId);
    const { data } = await asA
      .from('picks_group_view')
      .select('group_id')
      .eq('group_id', GROUP_ID_2);
    expect(data).toHaveLength(0);
  });
});

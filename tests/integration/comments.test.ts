import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import { TEST_USERS, ensureCoreTestUsers, ensureTeams, ensureSeasonAndWeek } from './fixtures/db';

const admin = createServiceClient();

const GROUP_A_ID = '00000000-0000-4002-8000-0000000000a4';
const GROUP_B_ID = '00000000-0000-4002-8000-0000000000b4';
const PAST_GAME_EXTERNAL = `comments-int-past-${Date.now()}`;
const FUTURE_GAME_EXTERNAL = `comments-int-future-${Date.now()}`;

let pastGameId: string;
let futureGameId: string;
const userAId = TEST_USERS[1].id;
const userBId = TEST_USERS[2].id;

beforeAll(async () => {
  await ensureCoreTestUsers(admin, false);
  await ensureTeams(admin);
  const { weekId } = await ensureSeasonAndWeek(admin, 2025, 1);

  const { data: teams } = await admin.from('teams').select('id').limit(2);
  if (!teams || teams.length < 2) throw new Error('Need 2 teams');
  const [homeId, awayId] = [teams[0].id, teams[1].id];

  // Seed groups (may already exist from other test runs — ignore conflicts)
  await admin.from('groups').upsert(
    [
      { id: GROUP_A_ID, name: 'Comments Int Group A' },
      { id: GROUP_B_ID, name: 'Comments Int Group B' }
    ],
    { onConflict: 'id', ignoreDuplicates: true }
  );

  await admin.from('group_memberships').upsert(
    [
      { group_id: GROUP_A_ID, user_id: userAId, role: 'member' },
      { group_id: GROUP_B_ID, user_id: userBId, role: 'member' }
    ],
    { onConflict: 'group_id,user_id', ignoreDuplicates: true }
  );

  // Past game (already started)
  await admin.from('games').delete().eq('external_game_id', PAST_GAME_EXTERNAL);
  const { data: pastGame } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      external_game_id: PAST_GAME_EXTERNAL,
      commence_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      home_team_id: homeId,
      away_team_id: awayId
    })
    .select('id')
    .single();
  if (!pastGame) throw new Error('Could not create past game');
  pastGameId = pastGame.id;

  // Future game (not started)
  await admin.from('games').delete().eq('external_game_id', FUTURE_GAME_EXTERNAL);
  const { data: futureGame } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      external_game_id: FUTURE_GAME_EXTERNAL,
      commence_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      home_team_id: homeId,
      away_team_id: awayId
    })
    .select('id')
    .single();
  if (!futureGame) throw new Error('Could not create future game');
  futureGameId = futureGame.id;
});

afterAll(async () => {
  await admin.from('games').delete().eq('external_game_id', PAST_GAME_EXTERNAL);
  await admin.from('games').delete().eq('external_game_id', FUTURE_GAME_EXTERNAL);
});

describe('comments RLS — cross-group denial', () => {
  it('user A cannot read comments seeded in group B', async () => {
    // Seed a comment in group B via service role
    const { error: seedErr } = await admin.from('comments').insert({
      group_id: GROUP_B_ID,
      user_id: userBId,
      game_id: pastGameId,
      body: 'Group B only comment'
    });
    expect(seedErr).toBeNull();

    const asUserA = createUserClient(userAId);
    const { data } = await asUserA
      .from('comments')
      .select('id')
      .eq('group_id', GROUP_B_ID)
      .eq('game_id', pastGameId);

    expect(data).toHaveLength(0);
  });

  it('user A cannot insert a comment into group B', async () => {
    const asUserA = createUserClient(userAId);
    const { error } = await asUserA.from('comments').insert({
      group_id: GROUP_B_ID,
      user_id: userAId,
      game_id: pastGameId,
      body: 'Sneaky cross-group comment'
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});

describe('comments RLS — post-kickoff read gate', () => {
  it('member cannot read comments on a future game (pre-kickoff)', async () => {
    // Seed a pre-kickoff comment via service role
    await admin.from('comments').insert({
      group_id: GROUP_A_ID,
      user_id: userAId,
      game_id: futureGameId,
      body: 'Pre-kickoff comment'
    });

    const asUserA = createUserClient(userAId);
    const { data } = await asUserA
      .from('comments')
      .select('id')
      .eq('group_id', GROUP_A_ID)
      .eq('game_id', futureGameId);

    expect(data).toHaveLength(0);
  });

  it('member can read comments on a started game', async () => {
    const { error: seedErr } = await admin.from('comments').insert({
      group_id: GROUP_A_ID,
      user_id: userAId,
      game_id: pastGameId,
      body: 'Post-kickoff comment in group A'
    });
    expect(seedErr).toBeNull();

    const asUserA = createUserClient(userAId);
    const { data, error } = await asUserA
      .from('comments')
      .select('id, body')
      .eq('group_id', GROUP_A_ID)
      .eq('game_id', pastGameId);

    expect(error).toBeNull();
    expect(data && data.length).toBeGreaterThan(0);
  });
});

describe('reactions RLS — cross-group denial', () => {
  it('user A cannot read reactions in group B', async () => {
    await admin.from('reactions').insert({
      group_id: GROUP_B_ID,
      user_id: userBId,
      game_id: pastGameId,
      emoji: '🔥'
    });

    const asUserA = createUserClient(userAId);
    const { data } = await asUserA
      .from('reactions')
      .select('id')
      .eq('group_id', GROUP_B_ID)
      .eq('game_id', pastGameId);

    expect(data).toHaveLength(0);
  });

  it('user A cannot insert a reaction into group B', async () => {
    const asUserA = createUserClient(userAId);
    const { error } = await asUserA.from('reactions').insert({
      group_id: GROUP_B_ID,
      user_id: userAId,
      game_id: pastGameId,
      emoji: '👍'
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});

describe('reactions RLS — post-kickoff gate', () => {
  it('member cannot read reactions on a future game', async () => {
    await admin.from('reactions').insert({
      group_id: GROUP_A_ID,
      user_id: userAId,
      game_id: futureGameId,
      emoji: '😬'
    });

    const asUserA = createUserClient(userAId);
    const { data } = await asUserA
      .from('reactions')
      .select('id')
      .eq('group_id', GROUP_A_ID)
      .eq('game_id', futureGameId);

    expect(data).toHaveLength(0);
  });

  it('member can read and toggle reactions on a started game', async () => {
    const asUserA = createUserClient(userAId);

    const { error: insErr } = await asUserA.from('reactions').insert({
      group_id: GROUP_A_ID,
      user_id: userAId,
      game_id: pastGameId,
      emoji: '🎯'
    });
    expect(insErr).toBeNull();

    const { data } = await asUserA
      .from('reactions')
      .select('emoji')
      .eq('group_id', GROUP_A_ID)
      .eq('game_id', pastGameId);

    expect(data?.some((r) => r.emoji === '🎯')).toBe(true);
  });
});

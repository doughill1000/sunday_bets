// tests/integration/membership.test.ts
//
// Verifies that getPlayers() and the leaderboard/stats views scale correctly
// beyond the original six members. Seeds 10 users into the original group and
// runs the real query functions against the local Supabase stack.

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { ensureTeams, ensureAuthUsers, deleteAuthUsers } from './fixtures/db';
import { getPlayers } from '../../src/lib/server/db/queries/getPlayers';
import {
  getSeasonLeaderboard,
  getAvailableSeasons
} from '../../src/lib/server/db/queries/leaderboard';

const admin = createServiceClient();
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';
const SEASON_YEAR = 2099; // far-future year so no collision with real data

// 10 deterministic test user IDs for this suite
const MEMBER_IDS = Array.from(
  { length: 10 },
  (_, i) => `00000000-0000-0000-8000-${String(i + 1).padStart(12, '0')}`
);

let seedGameId: string;

beforeAll(async () => {
  const now = new Date().toISOString();

  // public.users.id is a FK to auth.users(id), so the auth rows must exist first.
  // Seed them via a direct Postgres connection (PostgREST can't write auth schema).
  await ensureAuthUsers(
    MEMBER_IDS.map((id, i) => ({
      id,
      email: `membertest${i + 1}@example.com`,
      displayName: `MemberTest${i + 1}`
    }))
  );

  // Seed public.users directly via service role
  const { error: userErr } = await admin.from('users').upsert(
    MEMBER_IDS.map((id, i) => ({
      id,
      display_name: `MemberTest${i + 1}`,
      role: 'player' as const,
      created_at: now
    })),
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('Failed to seed users: ' + userErr.message);

  // Add all 10 to the original group
  const { error: memberErr } = await admin.from('group_memberships').upsert(
    MEMBER_IDS.map((user_id) => ({
      group_id: ORIGINAL_GROUP_ID,
      user_id,
      role: 'member' as const
    })),
    { onConflict: 'group_id,user_id' }
  );
  if (memberErr) throw new Error('Failed to seed memberships: ' + memberErr.message);

  // Season
  let seasonId: number;
  {
    const { data: existing } = await admin
      .from('seasons')
      .select('id')
      .eq('year', SEASON_YEAR)
      .maybeSingle();
    if (existing) {
      seasonId = existing.id;
    } else {
      const { data, error } = await admin
        .from('seasons')
        .insert({ year: SEASON_YEAR })
        .select('id')
        .single();
      if (error) throw new Error('seed season: ' + error.message);
      seasonId = data.id;
    }
  }

  // Week
  let weekId: number;
  {
    const { data: existing } = await admin
      .from('weeks')
      .select('id')
      .eq('season_id', seasonId)
      .eq('week_number', 1)
      .maybeSingle();
    if (existing) {
      weekId = existing.id;
    } else {
      const { data, error } = await admin
        .from('weeks')
        .insert({
          season_id: seasonId,
          week_number: 1,
          start_ts: `${SEASON_YEAR}-09-01T00:00:00Z`,
          end_ts: `${SEASON_YEAR}-09-08T00:00:00Z`
        })
        .select('id')
        .single();
      if (error) throw new Error('seed week: ' + error.message);
      weekId = data.id;
    }
  }

  // Teams
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('Teams not found');
  const homeId = teams.find((t) => t.short_name === 'KC')!.id;
  const awayId = teams.find((t) => t.short_name === 'BUF')!.id;

  // Game
  const externalId = `membership-test-${SEASON_YEAR}`;
  {
    const { data: existing } = await admin
      .from('games')
      .select('id')
      .eq('external_game_id', externalId)
      .maybeSingle();
    if (existing) {
      seedGameId = existing.id;
    } else {
      const { data, error } = await admin
        .from('games')
        .insert({
          week_id: weekId,
          home_team_id: homeId,
          away_team_id: awayId,
          external_game_id: externalId,
          status: 'final',
          commence_time: `${SEASON_YEAR}-09-04T13:00:00Z`
        })
        .select('id')
        .single();
      if (error) throw new Error('seed game: ' + error.message);
      seedGameId = data.id;
    }
  }

  // Seed pick_settlement rows so the leaderboard view has data for this group.
  // pick_settlement columns: group_id, user_id, game_id, pick_id, points_delta, outcome
  const { error: settlErr } = await admin.from('pick_settlement').upsert(
    MEMBER_IDS.map((user_id, i) => ({
      user_id,
      game_id: seedGameId,
      group_id: ORIGINAL_GROUP_ID,
      pick_id: null,
      outcome: (i % 3 === 0 ? 'loss' : 'win') as 'win' | 'loss',
      points_delta: i % 3 === 0 ? -1 : 1,
      graded_at: now
    })),
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (settlErr) throw new Error('Failed to seed pick_settlement: ' + settlErr.message);

  // leaderboard_season_totals is a materialized view (issue #191): refresh it after
  // seeding settlements directly so getSeasonLeaderboard reflects them.
  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error('Failed to refresh_leaderboard_stats: ' + refreshErr.message);
});

afterAll(async () => {
  // Best-effort cleanup (non-fatal)
  await admin.from('pick_settlement').delete().eq('game_id', seedGameId).in('user_id', MEMBER_IDS);
  if (seedGameId) {
    await admin.from('games').delete().eq('id', seedGameId);
  }
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
  await admin
    .from('group_memberships')
    .delete()
    .eq('group_id', ORIGINAL_GROUP_ID)
    .in('user_id', MEMBER_IDS);
  await admin.from('users').delete().in('id', MEMBER_IDS);
  // Remove the auth.users rows too (cascades to any leftover public.users).
  await deleteAuthUsers(MEMBER_IDS);
});

describe('membership: 10+ members', () => {
  it('getPlayers returns all 10 seeded members', async () => {
    const players = await getPlayers(ORIGINAL_GROUP_ID);
    const seededIds = new Set(MEMBER_IDS);
    const found = players.filter((p) => seededIds.has(p.id));
    expect(found).toHaveLength(10);
  });

  it('getSeasonLeaderboard returns one row per member with correct totals', async () => {
    const entries = await getSeasonLeaderboard(SEASON_YEAR, ORIGINAL_GROUP_ID);
    const seededIds = new Set(MEMBER_IDS);
    const relevant = entries.filter((e) => seededIds.has(e.user_id));
    expect(relevant).toHaveLength(10);
    for (const entry of relevant) {
      expect(entry.decisions).toBe(1);
      expect(typeof entry.rank).toBe('number');
      expect(entry.rank).toBeGreaterThan(0);
    }
  });

  it('getAvailableSeasons includes the seeded season year', async () => {
    const seasons = await getAvailableSeasons(ORIGINAL_GROUP_ID);
    expect(seasons).toContain(SEASON_YEAR);
  });

  it('winning members rank above losing members', async () => {
    const entries = await getSeasonLeaderboard(SEASON_YEAR, ORIGINAL_GROUP_ID);
    const seededIds = new Set(MEMBER_IDS);
    const relevant = entries.filter((e) => seededIds.has(e.user_id));

    const winners = relevant.filter((e) => (e.total_points ?? 0) > 0);
    const losers = relevant.filter((e) => (e.total_points ?? 0) < 0);

    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);

    const minWinnerRank = Math.min(...winners.map((e) => e.rank ?? Infinity));
    const maxLoserRank = Math.max(...losers.map((e) => e.rank ?? 0));
    expect(minWinnerRank).toBeLessThan(maxLoserRank);
  });
});

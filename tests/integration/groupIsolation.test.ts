/**
 * groupIsolation.test.ts
 *
 * Integration tests for cross-group data isolation.
 *
 * These tests call the REAL query functions (service-role, security_invoker views)
 * and assert that each function returns only the rows belonging to the queried
 * group_id — even when two groups share members and the same game.
 *
 * Fixture ownership: season 2099 / week 10 (owned by seedTwoGroupSettlements).
 * Do NOT add games to that season/week from this file.
 */

import { describe, beforeAll, it, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { seedTwoGroupSettlements, type TwoGroupSettlementsResult } from './fixtures/db';

// Real query functions under test — call these exactly as production code does.
import { getSeasonLeaderboard, getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const admin = createServiceClient();

let fx: TwoGroupSettlementsResult;

beforeAll(async () => {
  fx = await seedTwoGroupSettlements(admin);
}, 60_000);

// ---------------------------------------------------------------------------
// Leaderboard isolation
// ---------------------------------------------------------------------------

describe('getSeasonLeaderboard — per-group isolation', () => {
  it('returns only group A members with correct win outcomes', async () => {
    const rows = await getSeasonLeaderboard(fx.seasonYear, fx.groupAId);

    // Only the two group-A members should appear.
    const userIds = rows.map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserAId);
    expect(userIds).not.toContain(fx.exclusiveUserBId);

    // Both group-A players should have 1 win (picked home/Chiefs, which covered).
    for (const row of rows) {
      if (row.user_id === fx.sharedUserId || row.user_id === fx.exclusiveUserAId) {
        expect(row.wins, `${row.display_name} should have 1 win in group A`).toBe(1);
        expect(row.losses).toBe(0);
        expect(row.total_points).toBeGreaterThan(0);
      }
    }
  });

  it('returns only group B members with correct loss outcomes', async () => {
    const rows = await getSeasonLeaderboard(fx.seasonYear, fx.groupBId);

    const userIds = rows.map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserBId);
    expect(userIds).not.toContain(fx.exclusiveUserAId);

    // Both group-B players should have 1 loss (picked away/Bills, which lost ATS).
    for (const row of rows) {
      if (row.user_id === fx.sharedUserId || row.user_id === fx.exclusiveUserBId) {
        expect(row.losses, `${row.display_name} should have 1 loss in group B`).toBe(1);
        expect(row.wins).toBe(0);
        expect(row.total_points).toBeLessThan(0);
      }
    }
  });

  it('shared user has OPPOSITE outcomes in group A vs group B', async () => {
    const [rowsA, rowsB] = await Promise.all([
      getSeasonLeaderboard(fx.seasonYear, fx.groupAId),
      getSeasonLeaderboard(fx.seasonYear, fx.groupBId)
    ]);

    const inA = rowsA.find((r) => r.user_id === fx.sharedUserId);
    const inB = rowsB.find((r) => r.user_id === fx.sharedUserId);

    expect(inA).toBeDefined();
    expect(inB).toBeDefined();

    // Group A: win; Group B: loss — the divergent settlement.
    expect(inA!.wins).toBe(1);
    expect(inA!.losses).toBe(0);
    expect(inB!.wins).toBe(0);
    expect(inB!.losses).toBe(1);
  });

  it('returns zero rows when querying a group the user is not a member of (non-existent group)', async () => {
    const PHANTOM_GROUP = '00000000-0000-4000-8000-000000000ffe';
    const rows = await getSeasonLeaderboard(fx.seasonYear, PHANTOM_GROUP);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Weekly cumulative leaderboard isolation
// ---------------------------------------------------------------------------

describe('getWeeklyCumulative — per-group isolation', () => {
  it('group A trend rows contain only group A member IDs', async () => {
    const rows = await getWeeklyCumulative(fx.seasonYear, fx.groupAId);

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserAId);
    expect(userIds).not.toContain(fx.exclusiveUserBId);
  });

  it('group B trend rows contain only group B member IDs', async () => {
    const rows = await getWeeklyCumulative(fx.seasonYear, fx.groupBId);

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserBId);
    expect(userIds).not.toContain(fx.exclusiveUserAId);
  });

  it('shared user cumulative_points reflects group-specific outcome', async () => {
    const [rowsA, rowsB] = await Promise.all([
      getWeeklyCumulative(fx.seasonYear, fx.groupAId),
      getWeeklyCumulative(fx.seasonYear, fx.groupBId)
    ]);

    const inA = rowsA.find((r) => r.user_id === fx.sharedUserId);
    const inB = rowsB.find((r) => r.user_id === fx.sharedUserId);

    expect(inA).toBeDefined();
    expect(inB).toBeDefined();

    // Group A win → positive points; Group B loss → negative points.
    expect(inA!.cumulative_points).toBeGreaterThan(0);
    expect(inB!.cumulative_points).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Stats (team / weight / H2H) isolation
// ---------------------------------------------------------------------------

describe('getStatsForSeason — per-group isolation', () => {
  it('group A team accuracy contains only group A member IDs', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupAId);

    const userIds = [...new Set(stats.teamAccuracy.map((r) => r.user_id))];
    expect(userIds).not.toContain(fx.exclusiveUserBId);

    // shared + exclA should be in group A team accuracy
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserAId);
  });

  it('group B team accuracy contains only group B member IDs', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupBId);

    const userIds = [...new Set(stats.teamAccuracy.map((r) => r.user_id))];
    expect(userIds).not.toContain(fx.exclusiveUserAId);

    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserBId);
  });

  it('group A weight accuracy reflects wins for all group A members', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupAId);

    // All picks use weight 'M' in the fixture.
    const mRows = stats.weightAccuracy.filter((r) => r.weight === 'M');
    const sharedRow = mRows.find((r) => r.user_id === fx.sharedUserId);
    const exclRow = mRows.find((r) => r.user_id === fx.exclusiveUserAId);

    expect(sharedRow).toBeDefined();
    expect(exclRow).toBeDefined();
    expect(sharedRow!.wins).toBe(1);
    expect(exclRow!.wins).toBe(1);
  });

  it('group B weight accuracy reflects losses for all group B members', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupBId);

    const mRows = stats.weightAccuracy.filter((r) => r.weight === 'M');
    const sharedRow = mRows.find((r) => r.user_id === fx.sharedUserId);
    const exclRow = mRows.find((r) => r.user_id === fx.exclusiveUserBId);

    expect(sharedRow).toBeDefined();
    expect(exclRow).toBeDefined();
    expect(sharedRow!.losses).toBe(1);
    expect(exclRow!.losses).toBe(1);
  });

  it('group A H2H shows wins for shared user (not losses)', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupAId);

    // The H2H row where shared user is the "user_id" side should show positive points.
    const sharedH2H = stats.headToHead.filter((r) => r.user_id === fx.sharedUserId);
    // No group-B exclusive user should appear in group A's H2H.
    const hasExclB = stats.headToHead.some(
      (r) => r.user_id === fx.exclusiveUserBId || r.opponent_user_id === fx.exclusiveUserBId
    );
    expect(hasExclB).toBe(false);

    if (sharedH2H.length > 0) {
      // shared user won in group A → positive points
      for (const row of sharedH2H) {
        expect(row.points).toBeGreaterThan(0);
      }
    }
  });

  it('group B H2H does not contain group A exclusive member', async () => {
    const stats = await getStatsForSeason(fx.seasonYear, fx.groupBId);

    const hasExclA = stats.headToHead.some(
      (r) => r.user_id === fx.exclusiveUserAId || r.opponent_user_id === fx.exclusiveUserAId
    );
    expect(hasExclA).toBe(false);
  });

  it('returns empty stats when querying a non-existent group', async () => {
    const PHANTOM_GROUP = '00000000-0000-4000-8000-000000000ffe';
    const stats = await getStatsForSeason(fx.seasonYear, PHANTOM_GROUP);

    expect(stats.teamAccuracy).toHaveLength(0);
    expect(stats.weightAccuracy).toHaveLength(0);
    expect(stats.headToHead).toHaveLength(0);
    expect(stats.trend).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Direct pick_settlement isolation (service-role query bypassing RLS)
// ---------------------------------------------------------------------------

describe('pick_settlement — direct service-role query isolation', () => {
  it('querying by group A returns only group A settlements', async () => {
    const { data, error } = await admin
      .from('pick_settlement')
      .select('group_id, user_id, outcome')
      .eq('group_id', fx.groupAId)
      .eq('game_id', fx.gameId);

    expect(error).toBeNull();
    const userIds = (data ?? []).map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserAId);
    expect(userIds).not.toContain(fx.exclusiveUserBId);

    // All outcomes in group A are 'win'
    for (const row of data ?? []) {
      expect(row.outcome).toBe(fx.expectedOutcomes.groupA[row.user_id as string]);
    }
  });

  it('querying by group B returns only group B settlements', async () => {
    const { data, error } = await admin
      .from('pick_settlement')
      .select('group_id, user_id, outcome')
      .eq('group_id', fx.groupBId)
      .eq('game_id', fx.gameId);

    expect(error).toBeNull();
    const userIds = (data ?? []).map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserBId);
    expect(userIds).not.toContain(fx.exclusiveUserAId);

    // All outcomes in group B are 'loss'
    for (const row of data ?? []) {
      expect(row.outcome).toBe(fx.expectedOutcomes.groupB[row.user_id as string]);
    }
  });

  it('shared user has divergent outcomes across groups', async () => {
    const [{ data: dataA }, { data: dataB }] = await Promise.all([
      admin
        .from('pick_settlement')
        .select('outcome')
        .eq('group_id', fx.groupAId)
        .eq('user_id', fx.sharedUserId)
        .eq('game_id', fx.gameId)
        .single(),
      admin
        .from('pick_settlement')
        .select('outcome')
        .eq('group_id', fx.groupBId)
        .eq('user_id', fx.sharedUserId)
        .eq('game_id', fx.gameId)
        .single()
    ]);

    expect(dataA?.outcome).toBe('win');
    expect(dataB?.outcome).toBe('loss');
  });
});

// ---------------------------------------------------------------------------
// Picks isolation (direct service-role query — RLS-free)
// ---------------------------------------------------------------------------

describe('picks table — direct service-role query isolation', () => {
  it('group A picks contain only group A member user IDs', async () => {
    const { data, error } = await admin
      .from('picks')
      .select('group_id, user_id, picked_team_id')
      .eq('group_id', fx.groupAId)
      .eq('game_id', fx.gameId);

    expect(error).toBeNull();
    const userIds = (data ?? []).map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserAId);
    expect(userIds).not.toContain(fx.exclusiveUserBId);

    // All group-A picks should be for the home team (winner)
    for (const row of data ?? []) {
      expect(row.picked_team_id).toBe(fx.homeTeamId);
    }
  });

  it('group B picks contain only group B member user IDs', async () => {
    const { data, error } = await admin
      .from('picks')
      .select('group_id, user_id, picked_team_id')
      .eq('group_id', fx.groupBId)
      .eq('game_id', fx.gameId);

    expect(error).toBeNull();
    const userIds = (data ?? []).map((r) => r.user_id);
    expect(userIds).toContain(fx.sharedUserId);
    expect(userIds).toContain(fx.exclusiveUserBId);
    expect(userIds).not.toContain(fx.exclusiveUserAId);

    // All group-B picks should be for the away team (loser)
    for (const row of data ?? []) {
      expect(row.picked_team_id).toBe(fx.awayTeamId);
    }
  });
});

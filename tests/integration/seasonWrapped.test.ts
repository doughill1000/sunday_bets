/**
 * seasonWrapped.test.ts
 *
 * Integration tests for the Season Wrapped orchestrator (#347) against a running local
 * Supabase. Uses the shared two-group settlement fixture (season 2099, week 10), which grades
 * its game and refreshes the leaderboard/stats matviews — so league_completed_standings reports
 * season 2099 complete and getSeasonLeaderboard returns the participants.
 *
 * No AI gateway is configured in the test env, so every blurb deterministically takes the
 * renderSeasonFallback path (is_fallback = true) — which also exercises the over-budget/failure
 * branch the AC calls for.
 *
 * Fixture ownership: season 2099 / week 10 (seedTwoGroupSettlements). This suite owns the
 * season_wrapped rows for the two fixture groups and clears them before asserting.
 */
import { describe, beforeAll, beforeEach, it, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { seedTwoGroupSettlements, type TwoGroupSettlementsResult } from './fixtures/db';
import { generateSeasonWrapped, sendSeasonWrappeds } from '$lib/server/seasonWrapped';

const admin = createServiceClient();
let fx: TwoGroupSettlementsResult;

async function clearWrapped(groupIds: string[], seasonYear: number) {
  await admin
    .from('season_wrapped')
    .delete()
    .in('group_id', groupIds)
    .eq('season_year', seasonYear);
}

async function rows(groupId: string, seasonYear: number) {
  const { data, error } = await admin
    .from('season_wrapped')
    .select('scope, subject_user_id, prose, is_fallback, facts')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  return data ?? [];
}

beforeAll(async () => {
  fx = await seedTwoGroupSettlements(admin);
}, 60_000);

describe('generateSeasonWrapped', () => {
  beforeEach(async () => {
    await clearWrapped([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('creates one league row plus one row per active player (fallback without a gateway)', async () => {
    const summary = await generateSeasonWrapped(fx.groupAId, fx.seasonYear);

    // Group A has two active players (shared + exclusive-A) → 3 subjects (league + 2 players).
    expect(summary.evaluated).toBe(3);
    expect(summary.generated).toBe(0); // no gateway configured → all fallback
    expect(summary.fallback).toBe(3);
    expect(summary.skipped).toBe(0);

    const persisted = await rows(fx.groupAId, fx.seasonYear);
    expect(persisted).toHaveLength(3);

    const league = persisted.filter((r) => r.scope === 'league');
    const players = persisted.filter((r) => r.scope === 'player');
    expect(league).toHaveLength(1);
    expect(league[0].subject_user_id).toBeNull();
    expect(players.map((p) => p.subject_user_id).sort()).toEqual(
      [fx.sharedUserId, fx.exclusiveUserAId].sort()
    );

    // Every row carries non-empty deterministic prose and the fallback flag.
    for (const r of persisted) {
      expect(typeof r.prose).toBe('string');
      expect(r.prose.length).toBeGreaterThan(0);
      expect(r.is_fallback).toBe(true);
    }
  });

  it('is idempotent: a second run skips every existing subject', async () => {
    await generateSeasonWrapped(fx.groupAId, fx.seasonYear);
    const second = await generateSeasonWrapped(fx.groupAId, fx.seasonYear);

    expect(second.evaluated).toBe(3);
    expect(second.skipped).toBe(3);
    expect(second.generated).toBe(0);
    expect(second.fallback).toBe(0);

    // No duplicate rows were written.
    expect(await rows(fx.groupAId, fx.seasonYear)).toHaveLength(3);
  });

  it('force regenerates and replaces every existing subject without duplicating rows', async () => {
    await generateSeasonWrapped(fx.groupAId, fx.seasonYear);
    const before = await admin
      .from('season_wrapped')
      .select('id')
      .eq('group_id', fx.groupAId)
      .eq('season_year', fx.seasonYear);
    const beforeIds = (before.data ?? []).map((r) => r.id).sort();

    const forced = await generateSeasonWrapped(fx.groupAId, fx.seasonYear, { force: true });

    expect(forced.evaluated).toBe(3);
    expect(forced.skipped).toBe(0); // force never skips
    expect(forced.replaced).toBe(3); // every existing row overwritten
    expect(forced.fallback).toBe(3); // still no gateway → fallback prose

    // Still exactly 3 rows, but each was replaced (regenerate-then-delete → new ids).
    const after = await admin
      .from('season_wrapped')
      .select('id')
      .eq('group_id', fx.groupAId)
      .eq('season_year', fx.seasonYear);
    const afterIds = (after.data ?? []).map((r) => r.id).sort();
    expect(afterIds).toHaveLength(3);
    expect(afterIds).not.toEqual(beforeIds);
  });

  it('persists a player packet with the expected shape', async () => {
    await generateSeasonWrapped(fx.groupAId, fx.seasonYear);
    const players = (await rows(fx.groupAId, fx.seasonYear)).filter((r) => r.scope === 'player');
    const sample = players[0].facts as Record<string, unknown>;
    expect(sample).toHaveProperty('rank');
    expect(sample).toHaveProperty('record');
    expect(sample).toHaveProperty('total_points');
  });
});

describe('cross-group isolation', () => {
  beforeEach(async () => {
    await clearWrapped([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('generates rows scoped to the requested group only', async () => {
    await generateSeasonWrapped(fx.groupBId, fx.seasonYear);

    // Group B has two active players (shared + exclusive-B) → 3 rows; group A untouched.
    expect(await rows(fx.groupBId, fx.seasonYear)).toHaveLength(3);
    expect(await rows(fx.groupAId, fx.seasonYear)).toHaveLength(0);

    const bPlayers = (await rows(fx.groupBId, fx.seasonYear))
      .filter((r) => r.scope === 'player')
      .map((r) => r.subject_user_id);
    expect(bPlayers).not.toContain(fx.exclusiveUserAId);
  });
});

describe('sendSeasonWrappeds (grade-cron season-end entry)', () => {
  beforeEach(async () => {
    await clearWrapped([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('generates a Wrapped for every group that played the final week', async () => {
    // Week 10 is the only (hence final) scoring week of season 2099 and is fully graded.
    const summary = await sendSeasonWrappeds(fx.weekId);

    expect(summary.groups).toBeGreaterThanOrEqual(2);
    // Both fixture groups now have their league + player rows.
    expect(await rows(fx.groupAId, fx.seasonYear)).toHaveLength(3);
    expect(await rows(fx.groupBId, fx.seasonYear)).toHaveLength(3);
  });

  it('re-running the cron entry skips already-generated subjects', async () => {
    await sendSeasonWrappeds(fx.weekId);
    const second = await sendSeasonWrappeds(fx.weekId);
    expect(second.generated).toBe(0);
    expect(second.skipped).toBeGreaterThanOrEqual(6); // both groups' subjects already exist
  });
});

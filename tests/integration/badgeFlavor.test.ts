/**
 * badgeFlavor.test.ts
 *
 * Integration tests for the AI badge-flavor orchestrator + render seam (#416) against a running
 * local Supabase. Reuses the shared two-group settlement fixture (season 2099, week 10), which
 * grades its game and refreshes the leaderboard/stats matviews — so league_completed_standings
 * reports season 2099 complete and computeBadges crowns at least one badge.
 *
 * No AI gateway is configured in the test env, so every flavor deterministically takes the
 * static-tagline fallback (is_fallback = true) — which also exercises the failure/over-budget
 * branch the AC calls for. The render-seam test injects a distinctive flavor directly to prove
 * getGroupCachePayload overlays ai_badge_flavors onto the crowned badge.
 *
 * Fixture ownership: this suite owns the ai_badge_flavors rows for the two fixture groups and
 * clears them before each test.
 */
import { describe, beforeAll, beforeEach, it, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { seedTwoGroupSettlements, type TwoGroupSettlementsResult } from './fixtures/db';
import { generateBadgeFlavors, sendBadgeFlavors } from '$lib/server/badgeFlavor';
import { getGroupCachePayload } from '$lib/server/readModels/groupCache';

const admin = createServiceClient();
let fx: TwoGroupSettlementsResult;

async function clearFlavors(groupIds: string[], seasonYear: number) {
  await admin
    .from('ai_badge_flavors')
    .delete()
    .in('group_id', groupIds)
    .eq('season_year', seasonYear);
}

async function flavorRows(groupId: string, seasonYear: number) {
  const { data, error } = await admin
    .from('ai_badge_flavors')
    .select('badge_id, flavor, is_fallback, facts')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  return data ?? [];
}

beforeAll(async () => {
  fx = await seedTwoGroupSettlements(admin);
}, 60_000);

describe('generateBadgeFlavors', () => {
  beforeEach(async () => {
    await clearFlavors([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('writes one fallback row per awarded badge (no gateway configured)', async () => {
    const summary = await generateBadgeFlavors(fx.groupAId, fx.seasonYear);

    expect(summary.evaluated).toBeGreaterThan(0);
    expect(summary.generated).toBe(0); // no gateway → every badge falls back
    expect(summary.fallback).toBe(summary.evaluated);
    expect(summary.skipped).toBe(0);

    const persisted = await flavorRows(fx.groupAId, fx.seasonYear);
    expect(persisted).toHaveLength(summary.evaluated);

    // Every row carries the deterministic static tagline + the fallback flag + a facts packet.
    for (const r of persisted) {
      expect(typeof r.flavor).toBe('string');
      expect(r.flavor.length).toBeGreaterThan(0);
      expect(r.is_fallback).toBe(true);
      expect(r.facts).toHaveProperty('holders');
      expect(r.facts).toHaveProperty('label');
    }
  });

  it('is idempotent: a second run skips every badge', async () => {
    const first = await generateBadgeFlavors(fx.groupAId, fx.seasonYear);
    const second = await generateBadgeFlavors(fx.groupAId, fx.seasonYear);

    expect(second.evaluated).toBe(first.evaluated);
    expect(second.skipped).toBe(second.evaluated);
    expect(second.generated).toBe(0);
    expect(second.fallback).toBe(0);

    // No duplicate rows were written.
    expect(await flavorRows(fx.groupAId, fx.seasonYear)).toHaveLength(first.evaluated);
  });

  it('force regenerates and replaces every badge in place (no duplicate rows)', async () => {
    const first = await generateBadgeFlavors(fx.groupAId, fx.seasonYear);
    const forced = await generateBadgeFlavors(fx.groupAId, fx.seasonYear, { force: true });

    expect(forced.skipped).toBe(0); // force never skips
    expect(forced.replaced).toBe(first.evaluated); // every existing row overwritten
    expect(forced.fallback).toBe(first.evaluated); // still no gateway → fallback

    // Upsert keeps exactly one row per badge — count unchanged.
    expect(await flavorRows(fx.groupAId, fx.seasonYear)).toHaveLength(first.evaluated);
  });
});

describe('cross-group isolation', () => {
  beforeEach(async () => {
    await clearFlavors([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('generates rows scoped to the requested group only', async () => {
    await generateBadgeFlavors(fx.groupBId, fx.seasonYear);

    expect((await flavorRows(fx.groupBId, fx.seasonYear)).length).toBeGreaterThan(0);
    expect(await flavorRows(fx.groupAId, fx.seasonYear)).toHaveLength(0);
  });
});

describe('render seam (getGroupCachePayload overlay)', () => {
  beforeEach(async () => {
    await clearFlavors([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('overlays a stored flavor onto its crowned badge, leaving others static', async () => {
    // With no flavor rows, crowned badges show their static FLAVORS tagline.
    const before = await getGroupCachePayload(fx.groupAId, fx.seasonYear);
    expect(before.badges.length).toBeGreaterThan(0);
    const target = before.badges[0];
    expect(target.flavor.length).toBeGreaterThan(0);

    // Store a distinctive AI flavor for exactly one crowned badge.
    const CUSTOM = 'CUSTOM AI VOICE — they earned every bit of it.';
    const { error } = await admin.from('ai_badge_flavors').insert({
      group_id: fx.groupAId,
      season_year: fx.seasonYear,
      badge_id: target.id,
      flavor: CUSTOM,
      facts: {},
      is_fallback: false
    });
    expect(error).toBeNull();

    const after = await getGroupCachePayload(fx.groupAId, fx.seasonYear);
    expect(after.badges.find((b) => b.id === target.id)?.flavor).toBe(CUSTOM);

    // Every other crowned badge keeps the exact static flavor it had before the overlay.
    for (const b of after.badges) {
      if (b.id === target.id) continue;
      expect(b.flavor).toBe(before.badges.find((x) => x.id === b.id)?.flavor);
    }
  });
});

describe('sendBadgeFlavors (grade-cron season-end entry)', () => {
  beforeEach(async () => {
    await clearFlavors([fx.groupAId, fx.groupBId], fx.seasonYear);
  });

  it('voices badges for every group that played the final week', async () => {
    // Week 10 is the only (hence final) scoring week of season 2099 and is fully graded.
    const summary = await sendBadgeFlavors(fx.weekId);

    expect(summary.groups).toBeGreaterThanOrEqual(2);
    expect((await flavorRows(fx.groupAId, fx.seasonYear)).length).toBeGreaterThan(0);
    expect((await flavorRows(fx.groupBId, fx.seasonYear)).length).toBeGreaterThan(0);
  });

  it('re-running the cron entry skips already-voiced badges', async () => {
    await sendBadgeFlavors(fx.weekId);
    const second = await sendBadgeFlavors(fx.weekId);
    expect(second.generated).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });
});

/**
 * groupScopedReadModels.test.ts
 *
 * Integration tests for the read-model composers that back the `/api/{stats,group,
 * leaderboard,recap}` cache routes (ADR-0017, ADR-0033). These are the data layer the new
 * routes return after the membership guard passes, so they must enforce the SAME per-group
 * isolation as the page loads they mirror — a member only ever sees their own group's rows.
 *
 * The composers reuse the existing query functions (no new SQL); these tests assert the
 * composed payloads stay group-scoped, mirroring groupIsolation.test.ts one level up.
 *
 * Fixture ownership: season 2099 / week 10 (owned by seedTwoGroupSettlements).
 */

import { describe, beforeAll, it, expect } from 'vitest';
import { createServiceClient } from './_auth';
import { seedTwoGroupSettlements, type TwoGroupSettlementsResult } from './fixtures/db';

// Read-model composers under test — exactly what the /api routes call.
import { getStatsCachePayload } from '$lib/server/readModels/statsCache';
import { getLeaderboardStandingsPayload } from '$lib/server/readModels/leaderboardCache';
import { getGroupCachePayload } from '$lib/server/readModels/groupCache';
import { getRecapCachePayload } from '$lib/server/readModels/recapCache';

const admin = createServiceClient();

let fx: TwoGroupSettlementsResult;

beforeAll(async () => {
  fx = await seedTwoGroupSettlements(admin);
}, 60_000);

describe('getStatsCachePayload — per-group isolation', () => {
  it('group A payload contains only group A members', async () => {
    const payload = await getStatsCachePayload(fx.groupAId, fx.seasonYear);
    const totalsIds = payload.totals.map((r) => r.user_id);
    expect(totalsIds).toContain(fx.sharedUserId);
    expect(totalsIds).toContain(fx.exclusiveUserAId);
    expect(totalsIds).not.toContain(fx.exclusiveUserBId);

    // Composed extras stay scoped too.
    const teamIds = [...new Set(payload.teamAccuracy.map((r) => r.user_id))];
    expect(teamIds).not.toContain(fx.exclusiveUserBId);
    const allTimeIds = payload.allTimeTotals.map((r) => r.user_id);
    expect(allTimeIds).not.toContain(fx.exclusiveUserBId);
    // Team book (#564), season + career, stays group-scoped like every other per-user cut.
    const teamBookIds = [...new Set(payload.teamBook.map((r) => r.user_id))];
    expect(teamBookIds).toContain(fx.exclusiveUserAId);
    expect(teamBookIds).not.toContain(fx.exclusiveUserBId);
    const teamBookAllTimeIds = [...new Set(payload.teamBookAllTime.map((r) => r.user_id))];
    expect(teamBookAllTimeIds).not.toContain(fx.exclusiveUserBId);
    expect(payload.seasonYear).toBe(fx.seasonYear);
  });

  it('group B payload contains only group B members', async () => {
    const payload = await getStatsCachePayload(fx.groupBId, fx.seasonYear);
    const totalsIds = payload.totals.map((r) => r.user_id);
    expect(totalsIds).toContain(fx.sharedUserId);
    expect(totalsIds).toContain(fx.exclusiveUserBId);
    expect(totalsIds).not.toContain(fx.exclusiveUserAId);
  });
});

describe('getLeaderboardStandingsPayload — per-group isolation', () => {
  it('group A standings contain only group A members with their outcomes', async () => {
    const payload = await getLeaderboardStandingsPayload(fx.groupAId, fx.seasonYear, fx.seasonYear);
    const ids = payload.totals.map((r) => r.user_id);
    expect(ids).toContain(fx.sharedUserId);
    expect(ids).toContain(fx.exclusiveUserAId);
    expect(ids).not.toContain(fx.exclusiveUserBId);

    // Group A players all won (picked the cover); divergent from group B.
    for (const row of payload.totals) {
      if (row.user_id === fx.sharedUserId || row.user_id === fx.exclusiveUserAId) {
        expect(row.wins).toBe(1);
        expect(row.losses).toBe(0);
      }
    }
  });

  it('group B standings contain only group B members', async () => {
    const payload = await getLeaderboardStandingsPayload(fx.groupBId, fx.seasonYear, fx.seasonYear);
    const ids = payload.totals.map((r) => r.user_id);
    expect(ids).toContain(fx.exclusiveUserBId);
    expect(ids).not.toContain(fx.exclusiveUserAId);
  });
});

describe('getGroupCachePayload — per-group isolation', () => {
  it('group A payload lists only group A members and the correct group', async () => {
    const payload = await getGroupCachePayload(fx.groupAId, fx.seasonYear);
    expect(payload.group.id).toBe(fx.groupAId);

    const memberIds = payload.members.map((m) => m.userId);
    expect(memberIds).toContain(fx.sharedUserId);
    expect(memberIds).toContain(fx.exclusiveUserAId);
    expect(memberIds).not.toContain(fx.exclusiveUserBId);
  });

  it('group B payload lists only group B members', async () => {
    const payload = await getGroupCachePayload(fx.groupBId, fx.seasonYear);
    expect(payload.group.id).toBe(fx.groupBId);

    const memberIds = payload.members.map((m) => m.userId);
    expect(memberIds).toContain(fx.sharedUserId);
    expect(memberIds).toContain(fx.exclusiveUserBId);
    expect(memberIds).not.toContain(fx.exclusiveUserAId);
  });
});

describe('getRecapCachePayload — per-group isolation', () => {
  // Distinct, recognizable prose per group so a leak is obvious rather than needing a
  // deep-equality diff. Idempotent upsert on (group_id, season_year, week_number) — the
  // fixture's own week (10) — so re-running this suite never accumulates rows.
  beforeAll(async () => {
    const { error } = await admin.from('ai_recaps').upsert(
      [
        {
          group_id: fx.groupAId,
          season_year: fx.seasonYear,
          week_number: 10,
          prose: 'GROUP A ONLY recap prose',
          facts: {},
          is_fallback: false,
          model: null,
          prompt_tokens: null,
          completion_tokens: null
        },
        {
          group_id: fx.groupBId,
          season_year: fx.seasonYear,
          week_number: 10,
          prose: 'GROUP B ONLY recap prose',
          facts: {},
          is_fallback: false,
          model: null,
          prompt_tokens: null,
          completion_tokens: null
        }
      ],
      { onConflict: 'group_id,season_year,week_number' }
    );
    if (error) throw new Error(`getRecapCachePayload fixture: upsert ai_recaps: ${error.message}`);
  });

  it('group A payload contains only group A recap prose and award holders', async () => {
    const payload = await getRecapCachePayload(fx.groupAId, fx.seasonYear);

    expect(payload.recaps).toHaveLength(1);
    expect(payload.recaps[0].prose).toBe('GROUP A ONLY recap prose');

    const week = payload.weeklyAwards.weeks.find((w) => w.week_number === 10);
    expect(week).toBeDefined();
    const holderIds = week!.awards.map((a) => a.holder.user_id);
    expect(holderIds).not.toContain(fx.exclusiveUserBId);
    const shelfIds = payload.weeklyAwards.shelf.map((s) => s.user_id);
    expect(shelfIds).not.toContain(fx.exclusiveUserBId);
  });

  it('group B payload contains only group B recap prose and award holders', async () => {
    const payload = await getRecapCachePayload(fx.groupBId, fx.seasonYear);

    expect(payload.recaps).toHaveLength(1);
    expect(payload.recaps[0].prose).toBe('GROUP B ONLY recap prose');

    const week = payload.weeklyAwards.weeks.find((w) => w.week_number === 10);
    expect(week).toBeDefined();
    const holderIds = week!.awards.map((a) => a.holder.user_id);
    expect(holderIds).not.toContain(fx.exclusiveUserAId);
    const shelfIds = payload.weeklyAwards.shelf.map((s) => s.user_id);
    expect(shelfIds).not.toContain(fx.exclusiveUserAId);
  });
});

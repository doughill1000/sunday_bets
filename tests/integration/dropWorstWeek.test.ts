// tests/integration/dropWorstWeek.test.ts
//
// Verifies drop-worst-week via getSeasonLeaderboard (TypeScript path).
//
// ADR-0005 rule: when a group has group_config.scoring_rules.drop_worst_week=true
// and a player has 2+ settled weeks, the single lowest-scoring week is excluded
// from total_points (the W/L record still counts that week).
//
// Strategy: seed season 2098 / week 1 and week 2 with two groups:
//   - Group DROP  (drop_worst_week: true)
//   - Group NODROP (no group_config row, defaults to false)
//
// One player (the "canary") has week1=+10 and week2=-4 in both groups.
// With drop enabled:  total = 10 + (-4) - min(-4, 10) = 10 - (-4) = 10
// Without drop:       total = 10 + (-4) = 6
//
// This suite owns season year 2098 to avoid collision with:
//   - seedTwoGroupSettlements -> season 2099/week 10
//   - membership.test.ts      -> season 2099/week 1
//   - grading.test.ts         -> season 2024/week 1
//   - lockPick.test.ts        -> season 2024/week 3
//   - games.test.ts           -> season 2024/week 2
//   - adminAuthz.test.ts      -> season 2097/week 5
//   - pgTAP 013               -> season 2041

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import {
  ensureAuthUsers,
  deleteAuthUsers,
  ensureTeams,
  ensureGroup,
  ensureMembership
} from './fixtures/db';
import { getSeasonLeaderboard } from '../../src/lib/server/db/queries/leaderboard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const admin = createServiceClient();

const DW_SEASON_YEAR = 2098;
const DW_WEEK_1 = 1;
const DW_WEEK_2 = 2;

// Stable group IDs for this suite (distinct from all other test fixtures).
const DROP_GROUP_ID = '00000000-0000-4000-8000-000000002098';
const NODROP_GROUP_ID = '00000000-0000-4000-8000-000000002099';

// Stable user IDs for this suite.
const CANARY_USER_ID = '00000000-0000-0000-0000-000000002098';
const CONTROL_USER_ID = '00000000-0000-0000-0000-000000002097';

// ---------------------------------------------------------------------------
// State accumulated during beforeAll
// ---------------------------------------------------------------------------

let seasonId: number;
let week1Id: number;
let week2Id: number;
let game1Id: string;
let game2Id: string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`dropWorstWeek: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(sid: number, weekNumber: number): Promise<number> {
  const startYear = DW_SEASON_YEAR;
  const startMonth = String(9 + weekNumber - 1).padStart(2, '0');
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: sid,
      week_number: weekNumber,
      start_ts: `${startYear}-${startMonth}-01T00:00:00Z`,
      end_ts: `${startYear}-${startMonth}-08T00:00:00Z`
    })
    .select('id')
    .single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('weeks')
    .select('id')
    .eq('season_id', sid)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (error || !existing) throw new Error(`dropWorstWeek: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

async function insertGame(
  weekId: number,
  homeId: number,
  awayId: number,
  externalId: string
): Promise<string> {
  // Delete any leftover game from a prior crashed run (avoids uq_games_matchup violation).
  await admin.from('games').delete().eq('external_game_id', externalId);

  const { data, error } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeId,
      away_team_id: awayId,
      external_game_id: externalId,
      status: 'final',
      commence_time: `${DW_SEASON_YEAR}-09-05T18:00:00Z`
    })
    .select('id')
    .single();
  if (error || !data)
    throw new Error(`dropWorstWeek: insert game ${externalId}: ${error?.message}`);
  return data.id as string;
}

async function insertSettlement(
  groupId: string,
  userId: string,
  gameId: string,
  pointsDelta: number,
  outcome: 'win' | 'loss'
) {
  const { error } = await admin.from('pick_settlement').upsert(
    {
      group_id: groupId,
      user_id: userId,
      game_id: gameId,
      pick_id: null,
      points_delta: pointsDelta,
      outcome,
      graded_at: new Date().toISOString()
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`dropWorstWeek: insert settlement: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Seed auth + public users.
  await ensureAuthUsers([
    { id: CANARY_USER_ID, email: 'dw-canary-2098@example.com', displayName: 'DWCanary2098' },
    { id: CONTROL_USER_ID, email: 'dw-control-2098@example.com', displayName: 'DWControl2098' }
  ]);

  const now = new Date().toISOString();
  const { error: userErr } = await admin.from('users').upsert(
    [
      { id: CANARY_USER_ID, display_name: 'DWCanary2098', role: 'player', created_at: now },
      { id: CONTROL_USER_ID, display_name: 'DWControl2098', role: 'player', created_at: now }
    ],
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('dropWorstWeek: upsert users: ' + userErr.message);

  // Groups
  await ensureGroup(admin, { id: DROP_GROUP_ID, name: 'DW Drop Group 2098' });
  await ensureGroup(admin, { id: NODROP_GROUP_ID, name: 'DW NoD Group 2098' });

  // Memberships — canary is in both, control only in DROP (as a comparison member)
  await ensureMembership(admin, DROP_GROUP_ID, [CANARY_USER_ID, CONTROL_USER_ID]);
  await ensureMembership(admin, NODROP_GROUP_ID, [CANARY_USER_ID]);

  // group_config: DROP group opts in; NODROP group has no row (default false)
  const { error: cfgErr } = await admin
    .from('group_config')
    .upsert(
      { group_id: DROP_GROUP_ID, line_source: 'fanduel', scoring_rules: { drop_worst_week: true } },
      { onConflict: 'group_id' }
    );
  if (cfgErr) throw new Error('dropWorstWeek: upsert group_config: ' + cfgErr.message);

  // Season + weeks
  seasonId = await upsertSeason(DW_SEASON_YEAR);
  week1Id = await upsertWeek(seasonId, DW_WEEK_1);
  week2Id = await upsertWeek(seasonId, DW_WEEK_2);

  // Teams (idempotent)
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('dropWorstWeek: need KC + BUF teams');
  const homeId = teams.find((t) => t.short_name === 'KC')!.id as number;
  const awayId = teams.find((t) => t.short_name === 'BUF')!.id as number;

  // Games (one per week; same matchup across weeks is allowed because weeks differ)
  game1Id = await insertGame(week1Id, homeId, awayId, `dw-2098-w1-kc-buf`);
  game2Id = await insertGame(week2Id, homeId, awayId, `dw-2098-w2-kc-buf`);

  // Settlements:
  //   Week 1: canary +10 win  (best week)
  //   Week 2: canary -4  loss (worst week — should be dropped when rule is on)
  //
  // With drop ON:  total = 10 - (-4) = 14 — no, ADR-0005 says subtract lowest:
  //   total = (10 + -4) - min(-4) = 6 - (-4) = 10
  // With drop OFF: total = 10 + (-4) = 6
  //
  // control user (only in DROP group) also has two weeks so the view includes them:
  //   Week 1: +5 win, Week 2: +5 win  -> drop lowest (+5) -> 5; without drop -> 10.
  // But we don't assert control; it just populates the view.
  await insertSettlement(DROP_GROUP_ID, CANARY_USER_ID, game1Id, 10, 'win');
  await insertSettlement(DROP_GROUP_ID, CANARY_USER_ID, game2Id, -4, 'loss');
  await insertSettlement(NODROP_GROUP_ID, CANARY_USER_ID, game1Id, 10, 'win');
  await insertSettlement(NODROP_GROUP_ID, CANARY_USER_ID, game2Id, -4, 'loss');
  await insertSettlement(DROP_GROUP_ID, CONTROL_USER_ID, game1Id, 5, 'win');
  await insertSettlement(DROP_GROUP_ID, CONTROL_USER_ID, game2Id, 5, 'win');

  // leaderboard_season_totals is a materialized view (issue #191): refresh it after
  // writing settlements directly so getSeasonLeaderboard reflects them.
  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr)
    throw new Error(`dropWorstWeek: refresh_leaderboard_stats: ${refreshErr.message}`);
});

afterAll(async () => {
  // Best-effort cleanup (non-fatal)
  await admin.from('pick_settlement').delete().in('game_id', [game1Id, game2Id]);
  await admin.from('games').delete().in('id', [game1Id, game2Id]);
  await admin.from('weeks').delete().in('id', [week1Id, week2Id]);
  await admin.from('seasons').delete().eq('year', DW_SEASON_YEAR);
  await admin.from('group_config').delete().eq('group_id', DROP_GROUP_ID);
  await admin
    .from('group_memberships')
    .delete()
    .in('group_id', [DROP_GROUP_ID, NODROP_GROUP_ID])
    .in('user_id', [CANARY_USER_ID, CONTROL_USER_ID]);
  await admin.from('users').delete().in('id', [CANARY_USER_ID, CONTROL_USER_ID]);
  await deleteAuthUsers([CANARY_USER_ID, CONTROL_USER_ID]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('drop-worst-week via getSeasonLeaderboard', () => {
  test('canary has total_points=10 in the DROP group (worst week -4 excluded)', async () => {
    const entries = await getSeasonLeaderboard(DW_SEASON_YEAR, DROP_GROUP_ID);
    const canary = entries.find((e) => e.user_id === CANARY_USER_ID);
    expect(canary).toBeDefined();
    // raw total = 10 + (-4) = 6; drop removes -4 => 6 - (-4) = 10
    expect(canary!.total_points).toBe(10);
  });

  test('canary has total_points=6 in the NODROP group (all weeks counted)', async () => {
    const entries = await getSeasonLeaderboard(DW_SEASON_YEAR, NODROP_GROUP_ID);
    const canary = entries.find((e) => e.user_id === CANARY_USER_ID);
    expect(canary).toBeDefined();
    // No drop: 10 + (-4) = 6
    expect(canary!.total_points).toBe(6);
  });

  test('drop is points-only: W/L record still counts the dropped week', async () => {
    const entries = await getSeasonLeaderboard(DW_SEASON_YEAR, DROP_GROUP_ID);
    const canary = entries.find((e) => e.user_id === CANARY_USER_ID);
    expect(canary).toBeDefined();
    // 2 decisions total (both weeks in record), even though week2 is dropped from points
    expect(canary!.decisions).toBe(2);
    expect(canary!.wins).toBe(1);
    expect(canary!.losses).toBe(1);
  });

  test('DROP group total is higher than NODROP group total for same scores', async () => {
    const dropEntries = await getSeasonLeaderboard(DW_SEASON_YEAR, DROP_GROUP_ID);
    const nodropEntries = await getSeasonLeaderboard(DW_SEASON_YEAR, NODROP_GROUP_ID);
    const canaryDrop = dropEntries.find((e) => e.user_id === CANARY_USER_ID)!;
    const canaryNodrop = nodropEntries.find((e) => e.user_id === CANARY_USER_ID)!;
    expect(canaryDrop.total_points).toBeGreaterThan(canaryNodrop.total_points);
  });

  test('drop does not apply to a player with only 1 settled week', async () => {
    // Seed a one-week player into the DROP group and confirm they get the raw total.
    const oneWeekUserId = '00000000-0000-0000-0000-000000002096';
    await ensureAuthUsers([
      { id: oneWeekUserId, email: 'dw-oneweek-2098@example.com', displayName: 'DWOneWeek2098' }
    ]);
    const { error: uErr } = await admin
      .from('users')
      .upsert(
        { id: oneWeekUserId, display_name: 'DWOneWeek2098', role: 'player' },
        { onConflict: 'id' }
      );
    if (uErr) throw new Error('dropWorstWeek one-week user upsert: ' + uErr.message);

    await ensureMembership(admin, DROP_GROUP_ID, [oneWeekUserId]);
    await insertSettlement(DROP_GROUP_ID, oneWeekUserId, game1Id, 7, 'win');
    // Refresh the matview (issue #191) so the new settlement is visible to the read below.
    {
      const { error } = await admin.rpc('refresh_leaderboard_stats');
      if (error) throw new Error(`dropWorstWeek: refresh_leaderboard_stats: ${error.message}`);
    }

    try {
      const entries = await getSeasonLeaderboard(DW_SEASON_YEAR, DROP_GROUP_ID);
      const oneWeekEntry = entries.find((e) => e.user_id === oneWeekUserId);
      expect(oneWeekEntry).toBeDefined();
      // Rule requires 2+ weeks; with only 1 week, raw total (7) stands.
      expect(oneWeekEntry!.total_points).toBe(7);
    } finally {
      // Inline cleanup so we don't leave extra rows that could affect other assertions.
      await admin
        .from('pick_settlement')
        .delete()
        .eq('user_id', oneWeekUserId)
        .eq('game_id', game1Id);
      await admin
        .from('group_memberships')
        .delete()
        .eq('group_id', DROP_GROUP_ID)
        .eq('user_id', oneWeekUserId);
      await admin.from('users').delete().eq('id', oneWeekUserId);
      await deleteAuthUsers([oneWeekUserId]);
    }
  });
});

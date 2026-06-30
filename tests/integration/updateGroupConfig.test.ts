// tests/integration/updateGroupConfig.test.ts
//
// Integration coverage for update_group_config (#154) end-to-end through a real
// JWT / PostgREST path (complements pgTAP 023, which exercises the in-DB auth path).
//
// Verifies the issue's "grading-reflects-config" line: a commissioner toggling
// drop_worst_week via the RPC flows through to getSeasonLeaderboard totals. Also
// confirms the commissioner gate (P0020) over the wire.
//
// Only drop_worst_week is toggled here (the freeze guard ignores it), so this suite
// is independent of which season happens to be the active (max-year) one.
//
// Owns season year 2095 to avoid collisions with:
//   - dropWorstWeek.test.ts -> 2098 ; membership.test.ts -> 2099
//   - adminAuthz.test.ts     -> 2097 ; grading/lockPick/games -> 2024 ; pgTAP 013 -> 2041

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import {
  ensureAuthUsers,
  deleteAuthUsers,
  ensureTeams,
  ensureGroup,
  ensureMembership
} from './fixtures/db';
import { getSeasonLeaderboard } from '../../src/lib/server/db/queries/leaderboard';

const admin = createServiceClient();

const UGC_SEASON_YEAR = 2095;
const GROUP_ID = '00000000-0000-4000-8000-000000002095';
const COMMISSIONER_ID = '00000000-0000-0000-0000-000000002095';
const MEMBER_ID = '00000000-0000-0000-0000-000000002094';

let seasonId: number;
let week1Id: number;
let week2Id: number;
let game1Id: string;
let game2Id: string;

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`updateGroupConfig: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(sid: number, weekNumber: number): Promise<number> {
  const startMonth = String(9 + weekNumber - 1).padStart(2, '0');
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: sid,
      week_number: weekNumber,
      start_ts: `${UGC_SEASON_YEAR}-${startMonth}-01T00:00:00Z`,
      end_ts: `${UGC_SEASON_YEAR}-${startMonth}-08T00:00:00Z`
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
  if (error || !existing)
    throw new Error(`updateGroupConfig: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

async function insertGame(
  weekId: number,
  homeId: number,
  awayId: number,
  externalId: string
): Promise<string> {
  await admin.from('games').delete().eq('external_game_id', externalId);
  const { data, error } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeId,
      away_team_id: awayId,
      external_game_id: externalId,
      status: 'final',
      commence_time: `${UGC_SEASON_YEAR}-09-05T18:00:00Z`
    })
    .select('id')
    .single();
  if (error || !data)
    throw new Error(`updateGroupConfig: insert game ${externalId}: ${error?.message}`);
  return data.id as string;
}

async function insertSettlement(gameId: string, pointsDelta: number, outcome: 'win' | 'loss') {
  const { error } = await admin.from('pick_settlement').upsert(
    {
      group_id: GROUP_ID,
      user_id: COMMISSIONER_ID,
      game_id: gameId,
      pick_id: null,
      points_delta: pointsDelta,
      outcome,
      graded_at: new Date().toISOString()
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`updateGroupConfig: insert settlement: ${error.message}`);
}

beforeAll(async () => {
  await ensureAuthUsers([
    { id: COMMISSIONER_ID, email: 'ugc-commissioner@example.com', displayName: 'UGC Commissioner' },
    { id: MEMBER_ID, email: 'ugc-member@example.com', displayName: 'UGC Member' }
  ]);

  const { error: userErr } = await admin.from('users').upsert(
    [
      { id: COMMISSIONER_ID, display_name: 'UGC Commissioner', role: 'player' },
      { id: MEMBER_ID, display_name: 'UGC Member', role: 'player' }
    ],
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('updateGroupConfig: upsert users: ' + userErr.message);

  await ensureGroup(admin, { id: GROUP_ID, name: 'UGC Group 2095' });
  // Commissioner + plain member so we can exercise the P0020 gate.
  const { error: comErr } = await admin
    .from('group_memberships')
    .upsert([{ group_id: GROUP_ID, user_id: COMMISSIONER_ID, role: 'commissioner' }], {
      onConflict: 'group_id,user_id'
    });
  if (comErr) throw new Error('updateGroupConfig: seed commissioner: ' + comErr.message);
  await ensureMembership(admin, GROUP_ID, [MEMBER_ID]);

  // group_config row must exist (the RPC UPDATEs it). Start with drop off, plus an
  // extra key to prove the jsonb merge preserves it.
  const { error: cfgErr } = await admin.from('group_config').upsert(
    {
      group_id: GROUP_ID,
      line_source: 'fanduel',
      grading_preset: 'house',
      scoring_rules: { drop_worst_week: false, missed_pick_penalty: -2 }
    },
    { onConflict: 'group_id' }
  );
  if (cfgErr) throw new Error('updateGroupConfig: upsert group_config: ' + cfgErr.message);

  seasonId = await upsertSeason(UGC_SEASON_YEAR);
  week1Id = await upsertWeek(seasonId, 1);
  week2Id = await upsertWeek(seasonId, 2);

  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('updateGroupConfig: need KC + BUF teams');
  const homeId = teams.find((t) => t.short_name === 'KC')!.id as number;
  const awayId = teams.find((t) => t.short_name === 'BUF')!.id as number;

  game1Id = await insertGame(week1Id, homeId, awayId, 'ugc-2095-w1-kc-buf');
  game2Id = await insertGame(week2Id, homeId, awayId, 'ugc-2095-w2-kc-buf');

  // Commissioner: week1 +10 win (best), week2 -4 loss (worst, dropped when on).
  await insertSettlement(game1Id, 10, 'win');
  await insertSettlement(game2Id, -4, 'loss');

  // leaderboard_season_totals is a materialized view (issue #191): refresh it after
  // seeding settlements so the baseline read below reflects them.
  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr)
    throw new Error('updateGroupConfig: refresh_leaderboard_stats: ' + refreshErr.message);
});

afterAll(async () => {
  await admin.from('pick_settlement').delete().in('game_id', [game1Id, game2Id]);
  await admin.from('games').delete().in('id', [game1Id, game2Id]);
  await admin.from('weeks').delete().in('id', [week1Id, week2Id]);
  await admin.from('seasons').delete().eq('year', UGC_SEASON_YEAR);
  await admin.from('group_config').delete().eq('group_id', GROUP_ID);
  await admin.from('group_memberships').delete().eq('group_id', GROUP_ID);
  await admin.from('groups').delete().eq('id', GROUP_ID);
  await admin.from('users').delete().in('id', [COMMISSIONER_ID, MEMBER_ID]);
  await deleteAuthUsers([COMMISSIONER_ID, MEMBER_ID]);
});

describe('update_group_config end-to-end', () => {
  test('non-commissioner is rejected with P0020', async () => {
    const asMember = createUserClient(MEMBER_ID);
    const { error } = await asMember.rpc('update_group_config', {
      p_group_id: GROUP_ID,
      p_grading_preset: 'house',
      p_drop_worst_week: true
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('P0020');
  });

  test('commissioner toggling drop_worst_week flows through to the leaderboard', async () => {
    // Baseline: drop off → both weeks count → total = 10 + (-4) = 6.
    const before = await getSeasonLeaderboard(UGC_SEASON_YEAR, GROUP_ID);
    expect(before.find((e) => e.user_id === COMMISSIONER_ID)?.total_points).toBe(6);

    // ADR-0018 requires drop_worst_week_start_year alongside the boolean, or the
    // rule is inert; scope it to this suite's own season.
    const asCommissioner = createUserClient(COMMISSIONER_ID);
    const { error } = await asCommissioner.rpc('update_group_config', {
      p_group_id: GROUP_ID,
      p_grading_preset: 'house',
      p_drop_worst_week: true,
      p_drop_worst_week_start_year: UGC_SEASON_YEAR
    });
    expect(error).toBeNull();

    // The config change feeds the materialized leaderboard (issue #191), which the
    // /api/group/update-config route refreshes after a successful update. This test
    // calls the RPC directly, so refresh explicitly to mirror that production path.
    const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
    expect(refreshErr).toBeNull();

    // Drop on → worst week (-4) excluded → total = 6 - (-4) = 10.
    const after = await getSeasonLeaderboard(UGC_SEASON_YEAR, GROUP_ID);
    expect(after.find((e) => e.user_id === COMMISSIONER_ID)?.total_points).toBe(10);

    // The jsonb merge preserved the unrelated missed_pick_penalty key.
    const { data: cfg } = await admin
      .from('group_config')
      .select('scoring_rules')
      .eq('group_id', GROUP_ID)
      .single();
    const rules = cfg?.scoring_rules as {
      drop_worst_week?: boolean;
      drop_worst_week_start_year?: number;
      missed_pick_penalty?: number;
    };
    expect(rules.drop_worst_week).toBe(true);
    expect(rules.drop_worst_week_start_year).toBe(UGC_SEASON_YEAR);
    expect(rules.missed_pick_penalty).toBe(-2);
  });
});

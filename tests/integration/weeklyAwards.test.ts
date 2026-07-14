// tests/integration/weeklyAwards.test.ts
//
// End-to-end check of the weekly-hardware read model (issue #387): seed a fully-graded
// scoring week of real picks, grade + refresh the matviews, then assert getSeasonWeeklyAwards
// derives the five awards, the season shelf, AND excludes a partially-graded week (the
// completeness gate). The award *selection* logic itself is unit-tested exhaustively in
// src/lib/domain/__tests__/weeklyAwards.test.ts; this suite verifies the DB wiring.
//
// Owns season year 2093 (distinct from 2009/2099/2098/2097/2024/2041 used elsewhere).

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import {
  ensureAuthUsers,
  deleteAuthUsers,
  ensureTeams,
  ensureGroup,
  ensureMembership
} from './fixtures/db';
import { getSeasonWeeklyAwards } from '../../src/lib/server/readModels/weeklyAwards';

const admin = createServiceClient();

const SEASON_YEAR = 2093;
const GROUP_ID = '00000000-0000-4000-8000-000000002093';
const ALICE = '00000000-0000-0000-0000-000000209301';
const BOB = '00000000-0000-0000-0000-000000209302';
const CAROL = '00000000-0000-0000-0000-000000209303';

let week1Id: number;
let week2Id: number;
const gameIds: string[] = [];
let teamId: Record<string, number> = {};

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (!existing) throw new Error(`weeklyAwards: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(seasonId: number, weekNumber: number, startTs: string): Promise<number> {
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: seasonId,
      week_number: weekNumber,
      start_ts: startTs,
      end_ts: startTs,
      is_scoring: true
    })
    .select('id')
    .single();
  if (ins) return ins.id as number;
  const { data: existing } = await admin
    .from('weeks')
    .select('id')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (!existing) throw new Error(`weeklyAwards: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

async function insertGame(
  weekId: number,
  homeId: number,
  awayId: number,
  ext: string,
  final: { home: number; away: number } | null
): Promise<string> {
  await admin.from('games').delete().eq('external_game_id', ext);
  const { data, error } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeId,
      away_team_id: awayId,
      external_game_id: ext,
      status: final ? 'final' : 'scheduled',
      commence_time: '2093-09-07T18:00:00Z',
      final_scores: final
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`weeklyAwards: insert game ${ext}: ${error?.message}`);
  return data.id as string;
}

async function insertLine(gameId: string, spreadTeamId: number, spreadValue: number) {
  const { error } = await admin.from('game_lines').insert({
    game_id: gameId,
    source: 'fanduel',
    spread_team_id: spreadTeamId,
    spread_value: spreadValue,
    is_active_line: true
  });
  if (error) throw new Error(`weeklyAwards: insert line: ${error.message}`);
}

async function insertPick(
  userId: string,
  gameId: string,
  pickedTeamId: number,
  homeTeamId: number,
  spreadAbs: number
) {
  const { error } = await admin.from('picks').upsert(
    {
      group_id: GROUP_ID,
      user_id: userId,
      game_id: gameId,
      picked_team_id: pickedTeamId,
      // Home is favored by `spreadAbs`; the locked spread team is always the home side here.
      locked_spread_team_id: homeTeamId,
      locked_spread_value: spreadAbs,
      weight: 'M',
      locked_by: userId,
      locked_at: '2093-09-06T18:00:00Z'
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`weeklyAwards: insert pick: ${error.message}`);
}

beforeAll(async () => {
  await ensureAuthUsers([
    { id: ALICE, email: 'wa-alice-2093@example.com', displayName: 'WA_Alice' },
    { id: BOB, email: 'wa-bob-2093@example.com', displayName: 'WA_Bob' },
    { id: CAROL, email: 'wa-carol-2093@example.com', displayName: 'WA_Carol' }
  ]);
  await admin.from('users').upsert(
    [
      { id: ALICE, display_name: 'WA_Alice', role: 'player' },
      { id: BOB, display_name: 'WA_Bob', role: 'player' },
      { id: CAROL, display_name: 'WA_Carol', role: 'player' }
    ],
    { onConflict: 'id' }
  );
  await ensureGroup(admin, { id: GROUP_ID, name: 'Weekly Awards Group 2093' });
  await ensureMembership(admin, GROUP_ID, [ALICE, BOB, CAROL]);

  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF', 'PHI', 'DAL']);
  if (!teams || teams.length < 4) throw new Error('weeklyAwards: need KC/BUF/PHI/DAL teams');
  teamId = Object.fromEntries(teams.map((t) => [t.short_name, t.id as number]));

  const seasonId = await upsertSeason(SEASON_YEAR);
  week1Id = await upsertWeek(seasonId, 1, '2093-09-04T00:00:00Z');
  week2Id = await upsertWeek(seasonId, 2, '2093-09-11T00:00:00Z');

  // ── Week 1 (fully graded) ──────────────────────────────────────────────────
  // Game A: KC(home) 27, BUF(away) 20; KC -3.5 → KC covers by 3.5.
  const gA = await insertGame(week1Id, teamId.KC, teamId.BUF, 'wa-2093-w1-a', {
    home: 27,
    away: 20
  });
  await insertLine(gA, teamId.KC, -3.5);
  await insertPick(ALICE, gA, teamId.KC, teamId.KC, 3.5); // win
  await insertPick(BOB, gA, teamId.BUF, teamId.KC, 3.5); // loss, cover -3.5 (the bad beat)
  await insertPick(CAROL, gA, teamId.KC, teamId.KC, 3.5); // win

  // Game B: PHI(home) 24, DAL(away) 10; PHI -7 → PHI covers by 7.
  const gB = await insertGame(week1Id, teamId.PHI, teamId.DAL, 'wa-2093-w1-b', {
    home: 24,
    away: 10
  });
  await insertLine(gB, teamId.PHI, -7);
  await insertPick(ALICE, gB, teamId.PHI, teamId.PHI, 7); // win (minority: only Alice on PHI)
  await insertPick(BOB, gB, teamId.DAL, teamId.PHI, 7); // loss, cover -7
  await insertPick(CAROL, gB, teamId.DAL, teamId.PHI, 7); // loss, cover -7
  gameIds.push(gA, gB);

  // ── Week 2 (PARTIAL: game C graded, game D has no final → week incomplete) ──
  const gC = await insertGame(week2Id, teamId.KC, teamId.BUF, 'wa-2093-w2-c', {
    home: 30,
    away: 10
  });
  await insertLine(gC, teamId.KC, -3.5);
  await insertPick(ALICE, gC, teamId.KC, teamId.KC, 3.5); // win
  await insertPick(BOB, gC, teamId.BUF, teamId.KC, 3.5); // loss
  const gD = await insertGame(week2Id, teamId.PHI, teamId.DAL, 'wa-2093-w2-d', null); // NO final
  gameIds.push(gC, gD);

  // Grade the games that have finals (A, B, C); game D stays ungraded → week 2 partial.
  for (const gid of [gA, gB, gC]) {
    const { error } = await admin.rpc('grade_game', { p_game_id: gid });
    if (error) throw new Error(`weeklyAwards: grade_game ${gid}: ${error.message}`);
  }
  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error(`weeklyAwards: refresh: ${refreshErr.message}`);
});

afterAll(async () => {
  await admin.from('pick_settlement').delete().in('game_id', gameIds);
  await admin.from('picks').delete().in('game_id', gameIds);
  await admin.from('games').delete().in('id', gameIds);
  await admin.from('weeks').delete().in('id', [week1Id, week2Id]);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
  await admin
    .from('group_memberships')
    .delete()
    .eq('group_id', GROUP_ID)
    .in('user_id', [ALICE, BOB, CAROL]);
  await admin.from('users').delete().in('id', [ALICE, BOB, CAROL]);
  await deleteAuthUsers([ALICE, BOB, CAROL]);
});

describe('weekly hardware read model (#387)', () => {
  test('mints all five awards for the fully-graded week with the right holders', async () => {
    const { weeks } = await getSeasonWeeklyAwards(GROUP_ID, SEASON_YEAR);
    const week1 = weeks.find((w) => w.week_number === 1);
    expect(week1).toBeDefined();

    const holderById = Object.fromEntries(week1!.awards.map((a) => [a.id, a.holder.user_id]));
    // Alice: 2 wins (top points); Bob: 2 losses (bottom); Bob's BUF loss (-3.5) is the closest
    // cover; Alice's PHI win was the lone minority pick that hit. Alice and Carol both covered
    // KC by the same 3.5 margin (the smallest of the week's wins), so identity breaks the tie
    // to Alice ("WA_Alice" < "WA_Carol").
    expect(holderById['game-ball']).toBe(ALICE);
    expect(holderById['donkey-of-week']).toBe(BOB);
    expect(holderById['bad-beat']).toBe(BOB);
    expect(holderById['backdoor']).toBe(ALICE);
    expect(holderById['contrarian-win']).toBe(ALICE);

    // Bad Beat detail = the closest losing cover margin (Bob's BUF pick at -3.5).
    const badBeat = week1!.awards.find((a) => a.id === 'bad-beat');
    expect(badBeat && 'cover_margin' in badBeat ? badBeat.cover_margin : null).toBe(-3.5);

    // Backdoor detail = the smallest winning cover margin (Alice's KC pick at 3.5).
    const backdoor = week1!.awards.find((a) => a.id === 'backdoor');
    expect(backdoor && 'cover_margin' in backdoor ? backdoor.cover_margin : null).toBe(3.5);
  });

  test('excludes the partially-graded week via the completeness gate', async () => {
    const { weeks } = await getSeasonWeeklyAwards(GROUP_ID, SEASON_YEAR);
    // Week 2 has a graded game (C) but an ungraded one (D, no final), so it is incomplete
    // and must mint no hardware — even though settlements for game C exist in the matviews.
    expect(weeks.map((w) => w.week_number)).toEqual([1]);
  });

  test('the season shelf tallies each player’s hardware', async () => {
    const { shelf } = await getSeasonWeeklyAwards(GROUP_ID, SEASON_YEAR);
    const alice = shelf.find((e) => e.user_id === ALICE);
    const bob = shelf.find((e) => e.user_id === BOB);
    expect(alice?.total).toBe(3);
    expect(bob?.total).toBe(2);
    expect(new Set(alice?.awards.map((a) => a.id))).toEqual(
      new Set(['game-ball', 'backdoor', 'contrarian-win'])
    );
    expect(new Set(bob?.awards.map((a) => a.id))).toEqual(new Set(['donkey-of-week', 'bad-beat']));
    // Carol won nothing this week → absent from the shelf.
    expect(shelf.find((e) => e.user_id === CAROL)).toBeUndefined();
  });
});

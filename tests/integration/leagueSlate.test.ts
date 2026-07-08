// tests/integration/leagueSlate.test.ts
//
// Verifies the forward-looking League slate (issue #429) end-to-end through the TypeScript
// query layer: seed a season with (a) past graded KC-vs-BUF games that build the situational
// quadrants via league_ats_base, and (b) an *active, scoring* week holding one not-yet-kicked
// -off game with an active line. Then assert getLeagueSlate() returns that upcoming game with
// both sides' matching situational nugget, and that flipping the week to non-scoring collapses
// to the empty state. League ATS is group- and user-independent, so no users/groups/picks are
// seeded — just games and lines.
//
// Owns NFL season year 2073 (distinct from other suites: 2099/2009/2024/2041/2098/2097/2077).

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import { ensureTeams } from './fixtures/db';
import { getLeagueSlate } from '../../src/lib/server/db/queries/league';

const admin = createServiceClient();

const SEASON_YEAR = 2073;
const GRADED_IDS = ['ls-2073-graded-1', 'ls-2073-graded-2', 'ls-2073-graded-3', 'ls-2073-graded-4'];
const UPCOMING_ID = 'ls-2073-upcoming';
const ACTIVE_WEEK_NUMBER = 5;

let seasonId: number;
let activeWeekId: number;
const teamId: Record<string, number> = {};

const DAY_MS = 24 * 60 * 60 * 1000;

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`leagueSlate: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(
  weekNumber: number,
  startTs: string,
  endTs: string,
  isScoring: boolean
): Promise<number> {
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: seasonId,
      week_number: weekNumber,
      start_ts: startTs,
      end_ts: endTs,
      is_scoring: isScoring
    })
    .select('id')
    .single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('weeks')
    .select('id')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (error || !existing) throw new Error(`leagueSlate: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

// A past, graded KC(home,-7) win over BUF — makes KC a home favorite and BUF an away underdog
// for one game apiece in league_ats_base. Four of these clear the nugget's sample threshold.
async function insertGradedGame(externalId: string, weekId: number): Promise<void> {
  await admin.from('games').delete().eq('external_game_id', externalId);
  const { data: game, error: gErr } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: teamId.KC,
      away_team_id: teamId.BUF,
      external_game_id: externalId,
      status: 'final',
      commence_time: '2020-09-08T18:00:00Z',
      final_scores: { home: 28, away: 14 } // KC wins by 14 > 7 → covers as home favorite
    })
    .select('id')
    .single();
  if (gErr || !game) throw new Error(`leagueSlate: insert graded ${externalId}: ${gErr?.message}`);

  const { error: lErr } = await admin.from('game_lines').insert({
    game_id: game.id as string,
    source: 'fanduel',
    spread_team_id: teamId.KC,
    spread_value: -7,
    is_active_line: true,
    is_closing_line: true
  });
  if (lErr) throw new Error(`leagueSlate: insert graded line ${externalId}: ${lErr.message}`);
}

// The slate game: KC(home) vs BUF(away), kickoff in the future, not yet graded, with an
// active KC -7 line so ui_games surfaces the current favorite.
async function insertUpcomingGame(weekId: number, commenceTs: string): Promise<void> {
  await admin.from('games').delete().eq('external_game_id', UPCOMING_ID);
  const { data: game, error: gErr } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: teamId.KC,
      away_team_id: teamId.BUF,
      external_game_id: UPCOMING_ID,
      status: 'scheduled',
      commence_time: commenceTs
    })
    .select('id')
    .single();
  if (gErr || !game) throw new Error(`leagueSlate: insert upcoming: ${gErr?.message}`);

  const { error: lErr } = await admin.from('game_lines').insert({
    game_id: game.id as string,
    source: 'fanduel',
    spread_team_id: teamId.KC,
    spread_value: -7,
    is_active_line: true,
    is_closing_line: false
  });
  if (lErr) throw new Error(`leagueSlate: insert upcoming line: ${lErr.message}`);
}

beforeAll(async () => {
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('leagueSlate: need KC/BUF teams');
  for (const t of teams) teamId[t.short_name as string] = t.id as number;

  seasonId = await upsertSeason(SEASON_YEAR);

  // Four past graded weeks so the same KC-vs-BUF matchup can repeat without a same-week clash.
  for (let i = 0; i < GRADED_IDS.length; i++) {
    const wid = await upsertWeek(
      i + 1,
      `2020-09-0${i + 1}T00:00:00Z`,
      `2020-09-0${i + 2}T00:00:00Z`,
      true
    );
    await insertGradedGame(GRADED_IDS[i], wid);
  }

  // The active, scoring week that brackets *now*, holding one upcoming game.
  const now = Date.now();
  activeWeekId = await upsertWeek(
    ACTIVE_WEEK_NUMBER,
    new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    new Date(now + 5 * DAY_MS).toISOString(),
    true
  );
  await insertUpcomingGame(activeWeekId, new Date(now + 2 * DAY_MS).toISOString());

  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error(`leagueSlate: refresh_leaderboard_stats: ${refreshErr.message}`);
});

afterAll(async () => {
  await admin
    .from('games')
    .delete()
    .in('external_game_id', [...GRADED_IDS, UPCOMING_ID]);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
});

describe('league slate read path (#429)', () => {
  test('getLeagueSlate returns the upcoming game with both sides’ matching quadrant', async () => {
    const slate = await getLeagueSlate(SEASON_YEAR);

    expect(slate.weekNumber).toBe(ACTIVE_WEEK_NUMBER);
    expect(slate.games).toHaveLength(1);

    const [g] = slate.games;
    expect(g.home.label).toBe('KC');
    expect(g.away.label).toBe('BUF');
    // KC covered all four as a home favorite; BUF lost all four as an away underdog.
    expect(g.home.nugget).toEqual({
      text: '4-0 ATS as home favorite',
      record: '4-0',
      role: 'home favorite',
      games: 4
    });
    expect(g.away.nugget).toEqual({
      text: '0-4 ATS as away underdog',
      record: '0-4',
      role: 'away underdog',
      games: 4
    });
  });

  test('a non-scoring active week collapses to the empty slate', async () => {
    const { error } = await admin
      .from('weeks')
      .update({ is_scoring: false })
      .eq('id', activeWeekId);
    if (error) throw new Error(`leagueSlate: flip is_scoring: ${error.message}`);

    const slate = await getLeagueSlate(SEASON_YEAR);
    expect(slate.weekNumber).toBeNull();
    expect(slate.games).toHaveLength(0);
  });
});

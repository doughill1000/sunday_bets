// tests/integration/leagueAts.test.ts
//
// Verifies the league-wide team ATS read path (issue #406) end-to-end through the
// TypeScript query layer: seed games + closing lines + final scores, refresh the
// league_ats_base matview via refresh_leaderboard_stats, then assert getLeagueAts /
// getLeagueSeasons shape the rows correctly (nested records, home/away + fav/dog splits,
// fav/dog aggregate). League ATS is group- and user-independent, so no users/groups/picks
// are seeded — just games and lines.
//
// Owns NFL season year 2077 (distinct from other suites: 2099/2009/2024/2041/2098/2097).

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import { ensureTeams } from './fixtures/db';
import {
  getLeagueAts,
  getLeagueSeasons,
  getLeagueSituational,
  getLeagueTeamGameLog
} from '../../src/lib/server/db/queries/league';

const admin = createServiceClient();

const SEASON_YEAR = 2077;
const G1 = 'la-2077-g1';
const G2 = 'la-2077-g2';

let seasonId: number;
let weekId: number;
const teamId: Record<string, number> = {};

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`leagueAts: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(sid: number, weekNumber: number): Promise<number> {
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: sid,
      week_number: weekNumber,
      start_ts: '2077-09-06T00:00:00Z',
      end_ts: '2077-09-13T00:00:00Z',
      is_scoring: true
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
  if (error || !existing) throw new Error(`leagueAts: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

async function insertGameWithLine(opts: {
  externalId: string;
  homeId: number;
  awayId: number;
  homePts: number;
  awayPts: number;
  spreadTeamId: number;
  spreadValue: number;
}): Promise<void> {
  await admin.from('games').delete().eq('external_game_id', opts.externalId);
  const { data: game, error: gErr } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: opts.homeId,
      away_team_id: opts.awayId,
      external_game_id: opts.externalId,
      status: 'final',
      commence_time: '2077-09-08T18:00:00Z',
      final_scores: { home: opts.homePts, away: opts.awayPts }
    })
    .select('id')
    .single();
  if (gErr || !game) throw new Error(`leagueAts: insert game ${opts.externalId}: ${gErr?.message}`);

  const { error: lErr } = await admin.from('game_lines').insert({
    game_id: game.id as string,
    source: 'fanduel',
    spread_team_id: opts.spreadTeamId,
    spread_value: opts.spreadValue,
    is_active_line: true,
    is_closing_line: true
  });
  if (lErr) throw new Error(`leagueAts: insert line ${opts.externalId}: ${lErr.message}`);
}

beforeAll(async () => {
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF', 'PHI', 'DAL']);
  if (!teams || teams.length < 4) throw new Error('leagueAts: need KC/BUF/PHI/DAL teams');
  for (const t of teams) teamId[t.short_name as string] = t.id as number;

  seasonId = await upsertSeason(SEASON_YEAR);
  weekId = await upsertWeek(seasonId, 1);

  // g1: KC (home) favored -7, wins 28-14 -> home favorite covers ATS + SU.
  await insertGameWithLine({
    externalId: G1,
    homeId: teamId.KC,
    awayId: teamId.BUF,
    homePts: 28,
    awayPts: 14,
    spreadTeamId: teamId.KC,
    spreadValue: -7
  });
  // g2: DAL (away) favored -3, wins 30-20 -> away favorite covers ATS + SU; PHI (home dog) loses.
  await insertGameWithLine({
    externalId: G2,
    homeId: teamId.PHI,
    awayId: teamId.DAL,
    homePts: 20,
    awayPts: 30,
    spreadTeamId: teamId.DAL,
    spreadValue: -3
  });

  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error(`leagueAts: refresh_leaderboard_stats: ${refreshErr.message}`);
});

afterAll(async () => {
  await admin.from('games').delete().in('external_game_id', [G1, G2]);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
});

describe('league ATS read path (#406)', () => {
  test('getLeagueSeasons includes a season that has graded games', async () => {
    const seasons = await getLeagueSeasons();
    expect(seasons).toContain(SEASON_YEAR);
  });

  test('getLeagueAts shapes per-team records with home/away + fav/dog splits', async () => {
    const league = await getLeagueAts(SEASON_YEAR);
    expect(league.totalGames).toBe(2);
    expect(league.teams).toHaveLength(4);

    const kc = league.teams.find((t) => t.teamShortName === 'KC')!;
    expect(kc.games).toBe(1);
    expect(kc.ats).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(kc.home).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(kc.favorite).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(kc.su).toEqual({ wins: 1, losses: 0, pushes: 0 });

    const dal = league.teams.find((t) => t.teamShortName === 'DAL')!;
    expect(dal.away).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(dal.favorite).toEqual({ wins: 1, losses: 0, pushes: 0 });

    const buf = league.teams.find((t) => t.teamShortName === 'BUF')!;
    expect(buf.ats).toEqual({ wins: 0, losses: 1, pushes: 0 });
    expect(buf.underdog).toEqual({ wins: 0, losses: 1, pushes: 0 });
  });

  test('getLeagueAts aggregates favorites/underdogs and home/away for the season', async () => {
    const league = await getLeagueAts(SEASON_YEAR);

    // Both favorites (home KC, away DAL) covered.
    expect(league.favDogSeason.games).toBe(2);
    expect(league.favDogSeason.favoriteCovers).toBe(2);
    expect(league.favDogSeason.underdogCovers).toBe(0);
    expect(league.favDogByWeek).toHaveLength(1);
    expect(league.favDogByWeek[0].weekNumber).toBe(1);

    // Home: KC covered, PHI did not (1-1). Away: DAL covered, BUF did not (1-1).
    expect(league.homeAway?.home.games).toBe(2);
    expect(league.homeAway?.home.ats).toEqual({ wins: 1, losses: 1, pushes: 0 });
    expect(league.homeAway?.away.ats).toEqual({ wins: 1, losses: 1, pushes: 0 });
  });

  test('getLeagueAts includes each team’s current ATS streak and last-4 form (#428)', async () => {
    const league = await getLeagueAts(SEASON_YEAR);

    // Every team has played exactly one game, so each is on a length-1 run in that direction.
    const kc = league.streaks.find((s) => s.teamShortName === 'KC')!;
    expect(kc.streakResult).toBe('win');
    expect(kc.streakLength).toBe(1);
    expect(kc.last4).toEqual({ wins: 1, losses: 0, pushes: 0 });

    const buf = league.streaks.find((s) => s.teamShortName === 'BUF')!;
    expect(buf.streakResult).toBe('loss');
    expect(buf.streakLength).toBe(1);
    expect(buf.last4).toEqual({ wins: 0, losses: 1, pushes: 0 });
  });

  test('getLeagueTeamGameLog returns the team-relative per-game log (#428)', async () => {
    // KC (home) favored -7 and won 28-14 -> covered by 7 against the line.
    const log = await getLeagueTeamGameLog(SEASON_YEAR, teamId.KC);
    expect(log.games).toHaveLength(1);
    const g = log.games[0];
    expect(g.weekNumber).toBe(1);
    expect(g.opponentTeamId).toBe(teamId.BUF);
    expect(g.isHome).toBe(true);
    expect(g.spreadValue).toBe(-7); // team-relative: negative = favored
    expect(g.margin).toBe(7); // team-relative cover margin
    expect(g.atsResult).toBe('win');

    // BUF (away) was the +7 underdog and did not cover.
    const buf = await getLeagueTeamGameLog(SEASON_YEAR, teamId.BUF);
    expect(buf.games[0].isHome).toBe(false);
    expect(buf.games[0].spreadValue).toBe(7);
    expect(buf.games[0].margin).toBe(-7);
    expect(buf.games[0].atsResult).toBe('loss');
  });

  test('getLeagueSituational returns crossed home/away × favorite/underdog quadrants', async () => {
    const rows = await getLeagueSituational(SEASON_YEAR);
    const quadrant = (id: number, isHome: boolean, isFavorite: boolean) =>
      rows.find((r) => r.teamId === id && r.isHome === isHome && r.isFavorite === isFavorite);

    // KC home favorite covered; DAL away favorite covered; BUF away dog + PHI home dog lost.
    expect(quadrant(teamId.KC, true, true)?.ats).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(quadrant(teamId.DAL, false, true)?.ats).toEqual({ wins: 1, losses: 0, pushes: 0 });
    expect(quadrant(teamId.BUF, false, false)?.ats).toEqual({ wins: 0, losses: 1, pushes: 0 });
    expect(quadrant(teamId.PHI, true, false)?.ats).toEqual({ wins: 0, losses: 1, pushes: 0 });
  });
});

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import * as Sentry from '@sentry/sveltekit';

// Dynamic stubs that the module mocks will expose
let rpc: any;
let from: any;
let updates: Array<{ id: string; values: any }> = [];
let fetchScoresImpl: any; // Odds API /scores (fallback)
let fetchEspnWeekImpl: any; // ESPN scoreboard (primary)
let teamsImpl: any; // findTeamsByExternalKeys (external_key -> team id)

// Mock supabase service BEFORE importing grading module
vi.mock('$lib/supabase/service', () => ({
  supabaseService: new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === 'rpc') return rpc;
        if (prop === 'from') return from;
        return undefined;
      }
    }
  )
}));

// Mock Odds fallback fetcher
vi.mock('$lib/server/odds', () => ({
  fetchNFLScores: (...args: any[]) => fetchScoresImpl(...args)
}));

// Mock the ESPN scoreboard client (primary score source, ADR-0025)
vi.mock('$lib/server/schedule', () => ({
  fetchEspnWeek: (...args: any[]) => fetchEspnWeekImpl(...args)
}));

// Mock the external_key -> team id lookup used for matchup-identity matching
vi.mock('$lib/server/db/queries/findTeamsByExternalKeys', () => ({
  findTeamsByExternalKeys: (...args: any[]) => teamsImpl(...args)
}));

// Silence Sentry so the non-fatal refresh-failure path doesn't emit real events.
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

// The credibility-rating rebuild (#361) runs after each grade; stub it so this suite stays focused
// on grading itself. Its own math/IO are covered by the rating fold + integration tests.
vi.mock('$lib/server/rating/rebuild', () => ({
  rebuildPlayerRatings: vi.fn().mockResolvedValue(undefined)
}));

// AFTER mocks defined, import functions under test
import { gradeGame, gradeWeek, gradeSeason, refreshReadModels } from '$lib/server/grading';
import { rebuildPlayerRatings } from '$lib/server/rating/rebuild';

// Two target games in the same week (2024, week 1) with distinct matchup identities.
// Their ESPN abbreviations (external_key) map through teamsImpl to the team ids below.
function buildMocks() {
  updates = [];
  rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const weeks = [{ id: 301 }, { id: 302 }];
  const gamesByWeek = [{ id: 'gW1' }, { id: 'gW2' }];
  const seasonGames = [{ id: 'gS1' }, { id: 'gS2' }];
  const fullGames: any[] = [
    {
      id: 'gX',
      external_game_id: 'ext-x',
      home_team_id: 1,
      away_team_id: 2,
      home_team: { name: 'Home X', short_name: 'HX' },
      away_team: { name: 'Away X', short_name: 'AX' },
      week: { week_number: 1, season: { year: 2024 } }
    },
    {
      id: 'gS1',
      external_game_id: 'ext-s1',
      home_team_id: 3,
      away_team_id: 4,
      home_team: { name: 'Home S1', short_name: 'HS1' },
      away_team: { name: 'Away S1', short_name: 'AS1' },
      week: { week_number: 1, season: { year: 2024 } }
    }
  ];

  from = vi.fn().mockImplementation((table: string) => {
    const builder: any = {};
    if (table === 'weeks') {
      builder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: weeks, error: null })
      });
      return builder;
    }
    if (table === 'games') {
      builder.update = vi.fn().mockImplementation((values: any) => ({
        eq: vi.fn().mockImplementation(async (_col: string, id: string) => {
          updates.push({ id, values });
          return { data: null, error: null };
        })
      }));
      builder.select = vi.fn().mockImplementation((sel: string, opts?: any) => {
        // summarizeGrade count query: .in(...).not(...) => { count }
        if (opts?.count) {
          return {
            in: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ count: 2, error: null })
            })
          };
        }
        // Full refreshScores select embeds the team relationships.
        if (/home_team:teams/.test(sel)) {
          return {
            in: vi.fn().mockResolvedValue({ data: fullGames, error: null })
          };
        }
        // Simple id-only selects
        return {
          eq: vi.fn().mockResolvedValue({ data: gamesByWeek, error: null }),
          in: vi.fn().mockResolvedValue({ data: seasonGames, error: null })
        };
      });
      return builder;
    }
    if (table === 'pick_settlement') {
      builder.select = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ count: 5, error: null })
        })
      });
      return builder;
    }
    return builder;
  });

  return { weeks, gamesByWeek, seasonGames, fullGames };
}

// ESPN returns both matchups as completed finals, keyed by external_key.
function espnFinalsForBothGames() {
  return vi.fn().mockResolvedValue({
    weekNumber: 1,
    games: [
      {
        scheduleGameId: 'e1',
        date: '',
        homeTeamAbbr: 'KEYHX',
        awayTeamAbbr: 'KEYAX',
        homeScore: 21,
        awayScore: 17,
        status: 'final'
      },
      {
        scheduleGameId: 'e2',
        date: '',
        homeTeamAbbr: 'KEYHS1',
        awayTeamAbbr: 'KEYAS1',
        homeScore: 30,
        awayScore: 27,
        status: 'final'
      }
    ]
  });
}

beforeEach(() => {
  buildMocks();
  fetchScoresImpl = vi.fn().mockResolvedValue([]);
  fetchEspnWeekImpl = espnFinalsForBothGames();
  teamsImpl = vi.fn().mockResolvedValue([
    { id: 1, external_key: 'KEYHX' },
    { id: 2, external_key: 'KEYAX' },
    { id: 3, external_key: 'KEYHS1' },
    { id: 4, external_key: 'KEYAS1' }
  ]);
  (Sentry.captureException as unknown as Mock).mockClear();
  (rebuildPlayerRatings as unknown as Mock).mockClear();
});

describe('grading service', () => {
  it('gradeGame calls rpc and returns ok', async () => {
    const res = await gradeGame('g1');
    expect(rpc).toHaveBeenCalledWith('grade_game', { p_game_id: 'g1' });
    expect(res).toEqual({ ok: true, game_id: 'g1', gamesGraded: 2, picksSettled: 5 });
  });

  it('gradeGame throws on rpc error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    await expect(gradeGame('g1')).rejects.toThrow('fail');
  });

  it('gradeGame refreshes the leaderboard/stats matviews after grading', async () => {
    await gradeGame('g1');
    expect(rpc).toHaveBeenCalledWith('refresh_leaderboard_stats');
  });

  it('gradeGame rebuilds the credibility ratings after grading (#361)', async () => {
    await gradeGame('g1');
    expect(rebuildPlayerRatings).toHaveBeenCalled();
  });

  it('gradeGame still returns ok when the matview refresh fails (non-fatal)', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }); // grade_game
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'refresh boom' } }); // refresh
    const res = await gradeGame('g1');
    expect(res).toEqual({ ok: true, game_id: 'g1', gamesGraded: 2, picksSettled: 5 });
  });

  it('gradeGame reports the settlement summary counts', async () => {
    const res = await gradeGame('g1');
    expect(res.gamesGraded).toBe(2);
    expect(res.picksSettled).toBe(5);
  });

  it('gradeGame with refreshScores takes finals from ESPN by matchup identity, not Odds', async () => {
    const res = await gradeGame('gX', { refreshScores: true, daysFrom: 2 });

    // ESPN scoreboard queried for the game's week coordinates (2024, week 1, regular season).
    expect(fetchEspnWeekImpl).toHaveBeenCalledWith(2024, 1, 2, { retainRaw: true });
    // Odds fallback NOT consulted — ESPN had a completed final.
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    // Final attached from ESPN's explicit home/away, no name fuzzing.
    expect(updates.find((u) => u.id === 'gX')?.values).toEqual({
      final_scores: { home: 21, away: 17 }
    });
    expect(res.ok).toBe(true);
  });

  it('preseason weeks (negative week_number) query ESPN seasontype=1', async () => {
    // Re-point the full select at a preseason target (week_number -2 => espnWeek 2, seasontype 1).
    from = vi.fn().mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          update: vi.fn().mockImplementation((values: any) => ({
            eq: vi.fn().mockImplementation(async (_c: string, id: string) => {
              updates.push({ id, values });
              return { data: null, error: null };
            })
          })),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'gP',
                  external_game_id: 'ext-p',
                  home_team_id: 1,
                  away_team_id: 2,
                  home_team: { name: 'Home X', short_name: 'HX' },
                  away_team: { name: 'Away X', short_name: 'AX' },
                  week: { week_number: -2, season: { year: 2024 } }
                }
              ],
              error: null
            })
          })
        };
      }
      return {};
    });
    fetchEspnWeekImpl = vi.fn().mockResolvedValue({
      weekNumber: 2,
      games: [
        {
          scheduleGameId: 'ep',
          date: '',
          homeTeamAbbr: 'KEYHX',
          awayTeamAbbr: 'KEYAX',
          homeScore: 10,
          awayScore: 7,
          status: 'final'
        }
      ]
    });

    await gradeGame('gP', { refreshScores: true });
    expect(fetchEspnWeekImpl).toHaveBeenCalledWith(2024, 2, 1, { retainRaw: true });
    expect(updates.find((u) => u.id === 'gP')?.values.final_scores).toEqual({ home: 10, away: 7 });
  });

  it('falls back to Odds /scores for a game ESPN has not completed', async () => {
    // ESPN returns nothing completed for the week.
    fetchEspnWeekImpl = vi.fn().mockResolvedValue({ weekNumber: 1, games: [] });
    fetchScoresImpl = vi.fn().mockResolvedValue([
      {
        id: 'ext-x',
        completed: true,
        scores: [
          { name: 'Home X', score: 14 },
          { name: 'Away X', score: 10 }
        ],
        commence_time: '2024-01-01T00:00:00Z'
      }
    ]);

    await gradeGame('gX', { refreshScores: true, daysFrom: 3 });

    expect(fetchScoresImpl).toHaveBeenCalledWith(3);
    expect(updates.find((u) => u.id === 'gX')?.values.final_scores).toEqual({ home: 14, away: 10 });
  });

  it('an ESPN fetch failure is a non-fatal miss: logs to Sentry and falls back to Odds', async () => {
    fetchEspnWeekImpl = vi.fn().mockRejectedValue(new Error('ESPN down'));
    fetchScoresImpl = vi.fn().mockResolvedValue([
      {
        id: 'ext-x',
        completed: true,
        scores: [
          { name: 'Home X', score: 9 },
          { name: 'Away X', score: 6 }
        ],
        commence_time: '2024-01-01T00:00:00Z'
      }
    ]);

    await gradeGame('gX', { refreshScores: true });

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(fetchScoresImpl).toHaveBeenCalled();
    expect(updates.find((u) => u.id === 'gX')?.values.final_scores).toEqual({ home: 9, away: 6 });
  });

  it('grades an arbitrarily old game from ESPN with no daysFrom window (backfill path)', async () => {
    // daysFrom is a fallback-only concern; when ESPN has the final, no window applies.
    await gradeSeason(2019, { refreshScores: true, daysFrom: 1 });
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    expect(updates.find((u) => u.id === 'gS1')?.values.final_scores).toEqual({
      home: 30,
      away: 27
    });
  });

  it('gradeWeek without refresh only rpc', async () => {
    const res = await gradeWeek(10);
    expect(rpc).toHaveBeenCalledWith('grade_week', { p_week_id: 10 });
    expect(fetchEspnWeekImpl).not.toHaveBeenCalled();
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, week_id: 10, gamesGraded: 2, picksSettled: 5 });
  });

  it('gradeWeek skips the whole-table stats/ratings refresh when asked (#622 hoist)', async () => {
    await gradeWeek(10, { skipReadModelRefresh: true });
    // Grading still happens...
    expect(rpc).toHaveBeenCalledWith('grade_week', { p_week_id: 10 });
    // ...but neither global read-model refresh runs inline — the cron hoists them into one call.
    expect(rpc).not.toHaveBeenCalledWith('refresh_leaderboard_stats');
    expect(rebuildPlayerRatings).not.toHaveBeenCalled();
  });

  it('refreshReadModels refreshes the matviews and rebuilds the ratings, once', async () => {
    await refreshReadModels();
    expect(rpc).toHaveBeenCalledWith('refresh_leaderboard_stats');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rebuildPlayerRatings).toHaveBeenCalledTimes(1);
  });

  it('gradeWeek with refresh triggers an ESPN score pull and updates', async () => {
    await gradeWeek(11, { refreshScores: true });
    expect(fetchEspnWeekImpl).toHaveBeenCalled();
    expect(updates.some((u) => u.values.final_scores)).toBe(true);
  });

  it('gradeWeek with refresh throws when the games query fails', async () => {
    from = vi.fn().mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'games fetch failed' } })
          })
        };
      }
      return {};
    });
    await expect(gradeWeek(12, { refreshScores: true })).rejects.toThrow('games fetch failed');
    expect(fetchEspnWeekImpl).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('gradeSeason with refresh pulls finals from ESPN then rpc', async () => {
    const res = await gradeSeason(2024, { refreshScores: true, daysFrom: 3 });
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    expect(updates.find((u) => u.id === 'gS1')?.values.final_scores).toEqual({
      home: 30,
      away: 27
    });
    expect(rpc).toHaveBeenCalledWith('grade_season', { p_season_id: 2024 });
    expect(res).toEqual({ ok: true, season_id: 2024, gamesGraded: 2, picksSettled: 5 });
  });

  it('does not update when neither ESPN nor Odds has a completed final', async () => {
    fetchEspnWeekImpl = vi.fn().mockResolvedValue({ weekNumber: 1, games: [] });
    fetchScoresImpl = vi
      .fn()
      .mockResolvedValue([
        { id: 'ext-x', completed: false, scores: [], commence_time: '2099-01-01T00:00:00Z' }
      ]);
    await gradeGame('gX', { refreshScores: true });
    expect(updates.length).toBe(0);
  });
});

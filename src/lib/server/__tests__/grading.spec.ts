import { describe, it, expect, vi, beforeEach } from 'vitest';

// Dynamic stubs that the module mock will expose
let rpc: any;
let from: any;
let updates: Array<{ id: string; values: any }> = [];
let fetchScoresImpl: any;

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

// Mock odds fetcher
vi.mock('$lib/server/odds', () => ({
  fetchNFLScores: (...args: any[]) => fetchScoresImpl(...args)
}));

// Silence Sentry so the non-fatal refresh-failure path doesn't emit real events.
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

// AFTER mocks defined, import functions under test
import { gradeGame, gradeWeek, gradeSeason } from '$lib/server/grading';

function buildMocks() {
  updates = [];
  rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  // Data sets manipulated per test
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
      away_team: { name: 'Away X', short_name: 'AX' }
    },
    {
      id: 'gS1',
      external_game_id: 'ext-s1',
      home_team_id: 3,
      away_team_id: 4,
      home_team: { name: 'Home S1', short_name: 'HS1' },
      away_team: { name: 'Away S1', short_name: 'AS1' }
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
        // Lightweight heuristic: if multiline (full refreshScores select)
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

beforeEach(() => {
  buildMocks();
  fetchScoresImpl = vi.fn();
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

  it('gradeGame still returns ok when the matview refresh fails (non-fatal)', async () => {
    // First rpc (grade_game) succeeds; the refresh rpc reports an error.
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

  it('gradeGame with refreshScores fetches scores and updates finals when completed', async () => {
    fetchScoresImpl = vi.fn().mockResolvedValue([
      {
        id: 'ext-x',
        completed: true,
        scores: [
          { name: 'Home X', score: 21 },
          { name: 'Away X', score: 17 }
        ],
        commence_time: '2024-01-01T00:00:00Z'
      }
    ]);
    const res = await gradeGame('gX', { refreshScores: true, daysFrom: 2 });
    expect(fetchScoresImpl).toHaveBeenCalledWith(2);
    // update for gX should occur
    expect(updates.find((u) => u.id === 'gX')?.values).toEqual({
      final_scores: { home: 21, away: 17 }
    });
    expect(res.ok).toBe(true);
  });

  it('gradeWeek without refresh only rpc', async () => {
    const res = await gradeWeek(10);
    expect(rpc).toHaveBeenCalledWith('grade_week', { p_week_id: 10 });
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, week_id: 10, gamesGraded: 2, picksSettled: 5 });
  });

  it('gradeWeek with refresh triggers score pull and updates', async () => {
    fetchScoresImpl = vi.fn().mockResolvedValue([
      {
        id: 'ext-x',
        completed: true,
        scores: [
          { name: 'Home X', score: 24 },
          { name: 'Away X', score: 14 }
        ],
        commence_time: '2024-01-01T00:00:00Z'
      }
    ]);
    await gradeWeek(11, { refreshScores: true });
    expect(fetchScoresImpl).toHaveBeenCalled();
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
    expect(fetchScoresImpl).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('gradeSeason with refresh pulls weeks, scores, and updates then rpc', async () => {
    fetchScoresImpl = vi.fn().mockResolvedValue([
      {
        id: 'ext-s1',
        completed: true,
        scores: [
          { name: 'Home S1', score: 30 },
          { name: 'Away S1', score: 27 }
        ],
        commence_time: '2024-01-01T00:00:00Z'
      }
    ]);
    const res = await gradeSeason(2024, { refreshScores: true, daysFrom: 3 });
    expect(fetchScoresImpl).toHaveBeenCalledWith(3);
    expect(updates.find((u) => u.id === 'gS1')?.values.final_scores).toEqual({
      home: 30,
      away: 27
    });
    expect(rpc).toHaveBeenCalledWith('grade_season', { p_season_id: 2024 });
    expect(res).toEqual({ ok: true, season_id: 2024, gamesGraded: 2, picksSettled: 5 });
  });

  it('does not update when no completed events', async () => {
    fetchScoresImpl = vi
      .fn()
      .mockResolvedValue([
        { id: 'ext-x', completed: false, scores: [], commence_time: '2099-01-01T00:00:00Z' }
      ]);
    await gradeGame('gX', { refreshScores: true });
    expect(updates.length).toBe(0);
  });
});

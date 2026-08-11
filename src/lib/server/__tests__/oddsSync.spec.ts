import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncOddsForActiveWeek, syncOddsForActiveAndUpcomingWeeks } from '../oddsSync';
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from '../odds';
import { findActiveWeek } from '../db/queries/findActiveWeek';
import { findUpcomingWeek } from '../db/queries/findUpcomingWeek';
import { findTeamsByNames } from '../db/queries/findTeamsByNames';
import { attachLineToMatchup } from '../db/commands/attachLineToMatchup';
import { setActiveLine } from '../db/commands/setActiveLine';
import { supabaseService } from '$lib/supabase/service';
import type { SyncStats } from '$lib/types/server/odds';

// Mock all dependencies of the oddsSync module
vi.mock('../odds', () => ({
  fetchNFLSpreadsForWeek: vi.fn(),
  extractFanduelSpread: vi.fn()
}));

vi.mock('../db/queries/findActiveWeek', () => ({
  findActiveWeek: vi.fn()
}));

vi.mock('../db/queries/findUpcomingWeek', () => ({
  findUpcomingWeek: vi.fn()
}));

vi.mock('../db/queries/findTeamsByNames', () => ({
  findTeamsByNames: vi.fn()
}));

vi.mock('../db/commands/attachLineToMatchup', () => ({
  attachLineToMatchup: vi.fn()
}));

vi.mock('../db/commands/setActiveLine', () => ({
  setActiveLine: vi.fn()
}));

vi.mock('../settings', () => ({
  canSyncNow: vi.fn().mockResolvedValue(true)
}));

vi.mock('$lib/supabase/service', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
  };
  return { supabaseService: mockSupabase };
});

// Helper to control the mocked maybeSingle() return value
const mockMaybeSingle = (supabaseService as unknown as { maybeSingle: ReturnType<typeof vi.fn> })
  .maybeSingle;

// The sync now compares each returned game's kickoff against the wall clock (#804),
// so every fixture below is dated relative to a pinned instant rather than to
// whenever the suite happens to run. Without the pin these specs would quietly
// start failing the day real time passed their hard-coded September kickoffs.
// This one sits mid-preseason, days ahead of every slate the file fixtures use;
// the #804 block re-pins itself to a Sunday afternoon.
const DAYS_BEFORE_KICKOFF = '2026-08-25T12:00:00Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(DAYS_BEFORE_KICKOFF));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('syncOddsForActiveWeek', () => {
  beforeEach(() => {
    // Important: keep mock implementations (e.g., .mockReturnThis()) intact
    vi.clearAllMocks();
  });

  it('should return an error if no active week is found', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await syncOddsForActiveWeek();

    expect(result).toEqual({ ok: false, reason: 'No active week' });
  });

  it('should refuse to sync once the monthly API cap is reached', async () => {
    const { canSyncNow } = await import('../settings');
    (canSyncNow as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const result = await syncOddsForActiveWeek();

    expect(result).toEqual({ ok: false, reason: 'Odds API monthly call cap reached' });
    expect(fetchNFLSpreadsForWeek).not.toHaveBeenCalled();
  });

  it('should process a game and set a new line successfully', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-1',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2026-09-07T20:00:00Z'
      }
    ]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' }
    ]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: 3.5,
      source: 'fanduel'
    });
    expect(result).toEqual(
      expect.objectContaining({ ok: true, count: 1, unchanged: 0, skippedNoTeams: 0 })
    );
  });

  it('should skip a game if a team is not found in the database', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-1',
        home_team: 'Team A',
        away_team: 'Team C',
        commence_time: '2026-09-07T20:00:00Z'
      }
    ]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' }
    ]);

    const result = await syncOddsForActiveWeek();

    expect(attachLineToMatchup).not.toHaveBeenCalled();
    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, skippedNoTeams: 1, count: 0 }));
  });

  it('should skip a game when no pre-seeded matchup exists', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-1',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2026-09-07T20:00:00Z'
      }
    ]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' }
    ]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 3.5
    });
    // No pre-seeded game — attach returns null
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, skippedNoMatchup: 1, count: 0 }));
  });

  it('should skip setting a line if the new spread is identical to the active one', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-1',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2026-09-07T20:00:00Z'
      }
    ]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' }
    ]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: 3.5 }
    });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 0, unchanged: 1 }));
  });

  it('should update the line if the new spread is different from the active one', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-1',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2026-09-07T20:00:00Z'
      }
    ]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' }
    ]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 4.0
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: 3.5 }
    });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: 4.0,
      source: 'fanduel'
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1, unchanged: 0 }));
  });

  // The `pregame` cron's scope: near-kickoff freshness on the live slate only.
  // Priming the next week there would spend an extra API call every hour.
  it('never reaches for the upcoming week', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      week_number: 1,
      start_ts: '2026-09-04T00:00:00Z',
      end_ts: '2026-09-09T00:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await syncOddsForActiveWeek();

    expect(findUpcomingWeek).not.toHaveBeenCalled();
    expect(fetchNFLSpreadsForWeek).toHaveBeenCalledTimes(1);
    expect((result as SyncStats).weeks).toEqual([
      expect.objectContaining({ role: 'active', ok: true, weekId: 1, weekNumber: 1 })
    ]);
  });
});

// #801: a week could only acquire lines once it was already the active week, so
// every newly-active slate rendered as all "No line" until the next cron landed.
// The fix is scope, not schedule — the upcoming week is primed days ahead.
//
// The fixture is the preseason→regular boundary, the case that forces the sport
// key to be resolved per week: week -4 is the last tune-up (preseason endpoint),
// week 1 the opener (regular-season endpoint). Preseason weeks count DOWN, so
// "upcoming" can never be read off the week number.
describe('syncOddsForActiveAndUpcomingWeeks', () => {
  const PRESEASON_FINALE = {
    id: 4,
    week_number: -4,
    start_ts: '2026-08-25T04:00:00Z',
    end_ts: '2026-09-01T04:00:00Z'
  };
  const REGULAR_OPENER = {
    id: 5,
    week_number: 1,
    start_ts: '2026-09-01T04:00:00Z',
    end_ts: '2026-09-08T04:00:00Z'
  };

  const TEAMS = [
    { id: 10, name: 'Team A' },
    { id: 20, name: 'Team B' },
    { id: 30, name: 'Team C' },
    { id: 40, name: 'Team D' }
  ];

  function oddsGame(id: string, home: string, away: string) {
    return { id, home_team: home, away_team: away, commence_time: '2026-08-29T20:00:00Z' };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue(PRESEASON_FINALE);
    (findUpcomingWeek as ReturnType<typeof vi.fn>).mockResolvedValue(REGULAR_OPENER);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue(TEAMS);
    mockMaybeSingle.mockResolvedValue({ data: null });
  });

  it('lines the active week and the upcoming week, each from its own sport endpoint', async () => {
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([oddsGame('ext-pre', 'Team A', 'Team B')])
      .mockResolvedValueOnce([oddsGame('ext-reg', 'Team C', 'Team D')]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ spreadTeamName: 'Team A', spreadValue: 3.5 })
      .mockReturnValueOnce({ spreadTeamName: 'Team C', spreadValue: 7 });
    (attachLineToMatchup as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('game-pre')
      .mockResolvedValueOnce('game-reg');

    const result = await syncOddsForActiveAndUpcomingWeeks();

    // `sportKeyForWeek` derives the endpoint from the weekNumber handed to each
    // call (src/lib/server/odds.ts), so a per-week window IS a per-week endpoint:
    // americanfootball_nfl_preseason for -4, americanfootball_nfl for 1.
    expect(fetchNFLSpreadsForWeek).toHaveBeenCalledTimes(2);
    expect(fetchNFLSpreadsForWeek).toHaveBeenNthCalledWith(1, {
      id: 4,
      startTs: PRESEASON_FINALE.start_ts,
      endTs: PRESEASON_FINALE.end_ts,
      weekNumber: -4
    });
    expect(fetchNFLSpreadsForWeek).toHaveBeenNthCalledWith(2, {
      id: 5,
      startTs: REGULAR_OPENER.start_ts,
      endTs: REGULAR_OPENER.end_ts,
      weekNumber: 1
    });

    // The reproduction: the not-yet-active week comes out of the run with a line.
    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-reg',
      spreadTeamId: 30,
      spreadValue: 7,
      source: 'fanduel'
    });

    expect(result).toEqual(expect.objectContaining({ ok: true, count: 2, totalGames: 2 }));
    expect((result as SyncStats).weeks).toEqual([
      expect.objectContaining({ role: 'active', ok: true, weekId: 4, weekNumber: -4, count: 1 }),
      expect.objectContaining({ role: 'upcoming', ok: true, weekId: 5, weekNumber: 1, count: 1 })
    ]);
  });

  it('keeps the active week when priming the upcoming week fails', async () => {
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([oddsGame('ext-pre', 'Team A', 'Team B')])
      .mockRejectedValueOnce(new Error('Odds API 500: upstream exploded'));
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-pre');

    const result = await syncOddsForActiveAndUpcomingWeeks();

    // The active week is the one players are looking at: its completed work must
    // survive, and the run must stay a 200 rather than page as an incident.
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1 }));
    expect((result as SyncStats).weeks).toEqual([
      expect.objectContaining({ role: 'active', ok: true, count: 1 }),
      {
        role: 'upcoming',
        ok: false,
        weekId: 5,
        weekNumber: 1,
        reason: 'Odds API 500: upstream exploded'
      }
    ]);
  });

  it('stops cleanly when the monthly cap is reached between the two weeks', async () => {
    const { canSyncNow } = await import('../settings');
    (canSyncNow as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      oddsGame('ext-pre', 'Team A', 'Team B')
    ]);
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockReturnValue({
      spreadTeamName: 'Team A',
      spreadValue: 3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-pre');

    const result = await syncOddsForActiveAndUpcomingWeeks();

    // No second request, no throw, no half-written upcoming week.
    expect(fetchNFLSpreadsForWeek).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1 }));
    expect((result as SyncStats).weeks[1]).toEqual({
      role: 'upcoming',
      ok: false,
      weekId: 5,
      weekNumber: 1,
      reason: 'Odds API monthly call cap reached'
    });
  });

  it('reports the active week alone when no week follows it', async () => {
    (findUpcomingWeek as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await syncOddsForActiveAndUpcomingWeeks();

    expect(fetchNFLSpreadsForWeek).toHaveBeenCalledTimes(1);
    expect((result as SyncStats).weeks).toEqual([
      expect.objectContaining({ role: 'active', ok: true, weekId: 4, weekNumber: -4 })
    ]);
  });

  it('still skips the whole run gracefully when there is no active week', async () => {
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await syncOddsForActiveAndUpcomingWeeks();

    expect(result).toEqual({ ok: false, reason: 'No active week' });
    expect(fetchNFLSpreadsForWeek).not.toHaveBeenCalled();
  });
});

// #804: the Odds API `/odds` window returns *live* events alongside upcoming ones,
// and FanDuel quotes in-play spreads for them. The hourly `pregame` cron self-gates
// on any active-week game kicking off within six hours — true on an NFL Sunday from
// roughly 7am to 2pm ET — so it runs while the early slate is being played, and the
// sync had no kickoff filter of its own. Twelve genuine in-play rows exist in prod
// for 2025, written 4 minutes to 3h10m after kickoff and still the active line
// today; the worst reads -29.5 on a game that closed at -3, favorite flipped.
//
// Nothing was mis-graded, but only because three unrelated downstream filters each
// happened to exclude the bad row. The fixture below is the write itself.
describe('a slate already in progress (#804)', () => {
  const WEEK = {
    id: 2,
    week_number: 2,
    start_ts: '2026-09-08T04:00:00Z',
    end_ts: '2026-09-15T04:00:00Z'
  };

  // A real Sunday: the 1pm ET games are mid-second-quarter, the 4:25pm ET games
  // have not kicked off, and a `pregame` run lands right between them.
  const EARLY_KICKOFF = '2026-09-13T17:00:00Z'; // 1:00pm ET
  const LATE_KICKOFF = '2026-09-13T20:25:00Z'; // 4:25pm ET
  const MID_SLATE = '2026-09-13T18:05:00Z'; // 2:05pm ET

  const TEAMS = [
    { id: 10, name: 'Team A' },
    { id: 20, name: 'Team B' },
    { id: 30, name: 'Team C' },
    { id: 40, name: 'Team D' }
  ];

  // Keyed by game rather than call order, so a regression shows up as the wrong
  // write rather than as a fixture that quietly slid onto the wrong game.
  function armSlate() {
    (extractFanduelSpread as ReturnType<typeof vi.fn>).mockImplementation((g: { id: string }) =>
      g.id === 'ext-early'
        ? // The live in-play number: Team A is running away with it.
          { spreadTeamName: 'Team A', spreadValue: 29.5 }
        : { spreadTeamName: 'Team C', spreadValue: 6.5 }
    );
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ externalGameId }: { externalGameId: string }) =>
        externalGameId.replace(/^ext-/, 'game-')
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(MID_SLATE));
    (findActiveWeek as ReturnType<typeof vi.fn>).mockResolvedValue(WEEK);
    (findTeamsByNames as ReturnType<typeof vi.fn>).mockResolvedValue(TEAMS);
    mockMaybeSingle.mockResolvedValue({ data: null });
  });

  it('lines the game that has not kicked off and never touches the one in progress', async () => {
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-early',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: EARLY_KICKOFF
      },
      {
        id: 'ext-late',
        home_team: 'Team C',
        away_team: 'Team D',
        commence_time: LATE_KICKOFF
      }
    ]);
    armSlate();

    const result = await syncOddsForActiveWeek();

    // The started game is out before the write path begins — no line, and no
    // `external_game_id` attachment either.
    expect(setActiveLine).toHaveBeenCalledTimes(1);
    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-late',
      spreadTeamId: 30,
      spreadValue: 6.5,
      source: 'fanduel'
    });
    expect(attachLineToMatchup).toHaveBeenCalledTimes(1);
    expect(attachLineToMatchup).toHaveBeenCalledWith(
      expect.objectContaining({ externalGameId: 'ext-late' })
    );
    // Its existing active line is not even read, let alone deactivated.
    expect(supabaseService.from).toHaveBeenCalledTimes(1);

    // Observable in `cron_run_log` and in both cron endpoints' responses: a
    // non-zero count mid-slate is the guard working, not a fault.
    expect(result).toEqual(
      expect.objectContaining({ ok: true, totalGames: 2, count: 1, skippedStarted: 1 })
    );
    expect((result as SyncStats).weeks).toEqual([
      expect.objectContaining({ role: 'active', ok: true, count: 1, skippedStarted: 1 })
    ]);
  });

  it('treats a game kicking off exactly now as started', async () => {
    vi.setSystemTime(new Date(EARLY_KICKOFF));
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'ext-early',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: EARLY_KICKOFF
      }
    ]);
    armSlate();

    const result = await syncOddsForActiveWeek();

    // Kickoff is the boundary picks lock on, so it is the boundary the line
    // stops moving on too — the last pre-kickoff number is the canonical one.
    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ ok: true, count: 0, skippedStarted: 1, processed: 0 })
    );
  });

  it('primes an upcoming week untouched while the live slate is skipped', async () => {
    (findUpcomingWeek as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3,
      week_number: 3,
      start_ts: '2026-09-15T04:00:00Z',
      end_ts: '2026-09-22T04:00:00Z'
    });
    (fetchNFLSpreadsForWeek as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: 'ext-early', home_team: 'Team A', away_team: 'Team B', commence_time: EARLY_KICKOFF }
      ])
      .mockResolvedValueOnce([
        {
          id: 'ext-next',
          home_team: 'Team C',
          away_team: 'Team D',
          commence_time: '2026-09-20T17:00:00Z'
        }
      ]);
    armSlate();

    const result = await syncOddsForActiveAndUpcomingWeeks();

    // Next week's slate is days out, so it lines normally; the guard is per-game,
    // not per-week, and the totals carry the skip through both windows.
    expect(setActiveLine).toHaveBeenCalledTimes(1);
    expect(setActiveLine).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 'game-next', spreadValue: 6.5 })
    );
    expect(result).toEqual(
      expect.objectContaining({ ok: true, totalGames: 2, count: 1, skippedStarted: 1 })
    );
  });
});

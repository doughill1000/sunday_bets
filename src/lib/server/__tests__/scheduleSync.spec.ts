import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { syncSchedule } from '../scheduleSync';
import { fetchEspnWeek } from '../schedule';
import { findTeamsByExternalKeys } from '../db/queries/findTeamsByExternalKeys';
import { upsertSeasonByYear } from '../db/commands/upsertSeasonByYear';
import { upsertWeek } from '../db/commands/upsertWeek';
import { upsertGameByMatchup } from '../db/commands/upsertGameByMatchup';

// Mock all dependencies of the scheduleSync module. Tiny week counts keep the loops
// short; the error classes back the instanceof guards in syncSchedule.
vi.mock('../schedule', () => ({
  fetchEspnWeek: vi.fn(),
  EspnFetchError: class EspnFetchError extends Error {},
  EspnParseError: class EspnParseError extends Error {},
  NFL_PRESEASON_WEEKS: 2,
  NFL_REGULAR_SEASON_WEEKS: 3
}));

vi.mock('../db/queries/findTeamsByExternalKeys', () => ({
  findTeamsByExternalKeys: vi.fn()
}));

vi.mock('../db/commands/upsertSeasonByYear', () => ({
  upsertSeasonByYear: vi.fn()
}));

vi.mock('../db/commands/upsertWeek', () => ({
  upsertWeek: vi.fn()
}));

vi.mock('../db/commands/upsertGameByMatchup', () => ({
  upsertGameByMatchup: vi.fn()
}));

vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

const TEAMS = [
  { external_key: 'PHI', id: 1 },
  { external_key: 'DAL', id: 2 }
];

const GAME = {
  scheduleGameId: 'e1',
  date: '2026-09-10T00:15Z',
  homeTeamAbbr: 'PHI',
  awayTeamAbbr: 'DAL',
  status: 'scheduled' as const
};

describe('syncSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (findTeamsByExternalKeys as Mock).mockResolvedValue(TEAMS);
    (upsertSeasonByYear as Mock).mockResolvedValue(99);
    (upsertWeek as Mock).mockResolvedValue(500);
    (upsertGameByMatchup as Mock).mockResolvedValue('game-uuid');
  });

  it('creates no season when no week (pre- or regular) returns games (issue #272)', async () => {
    // Mirrors ESPN serving an unpublished/fallback year: every week is empty.
    (fetchEspnWeek as Mock).mockResolvedValue({ weekNumber: 1, games: [] });

    const result = await syncSchedule(2026);

    expect(upsertSeasonByYear).not.toHaveBeenCalled();
    expect(upsertWeek).not.toHaveBeenCalled();
    expect(upsertGameByMatchup).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ ok: true, year: 2026, weeksProcessed: 0, gamesUpserted: 0 })
    );
  });

  it('stores a regular-season week with a positive number and is_scoring=true', async () => {
    (fetchEspnWeek as Mock).mockImplementation((_year, week, seasonType) =>
      Promise.resolve(
        seasonType === 2 && week === 1
          ? { weekNumber: 1, games: [GAME] }
          : { weekNumber: week, games: [] }
      )
    );

    const result = await syncSchedule(2026);

    expect(upsertSeasonByYear).toHaveBeenCalledTimes(1);
    expect(upsertWeek).toHaveBeenCalledTimes(1);
    expect(upsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: 99, weekNumber: 1, isScoring: true })
    );
    expect(upsertGameByMatchup).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({ ok: true, year: 2026, weeksProcessed: 1, gamesUpserted: 1 })
    );
  });

  it('stores a preseason week as a negative number with is_scoring=false (ADR-0016)', async () => {
    // ESPN preseason week 1 (seasontype=1) maps to our week_number -1, non-scoring.
    (fetchEspnWeek as Mock).mockImplementation((_year, week, seasonType) =>
      Promise.resolve(
        seasonType === 1 && week === 1
          ? { weekNumber: 1, games: [GAME] }
          : { weekNumber: week, games: [] }
      )
    );

    const result = await syncSchedule(2026);

    expect(upsertWeek).toHaveBeenCalledTimes(1);
    expect(upsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: 99, weekNumber: -1, isScoring: false })
    );
    expect(result).toEqual(
      expect.objectContaining({ ok: true, year: 2026, weeksProcessed: 1, gamesUpserted: 1 })
    );
  });

  it('processes preseason and regular weeks in the same run', async () => {
    // A game in preseason week 1 and regular week 1 → two weeks, both stored.
    (fetchEspnWeek as Mock).mockImplementation((_year, week) =>
      Promise.resolve(
        week === 1 ? { weekNumber: 1, games: [GAME] } : { weekNumber: week, games: [] }
      )
    );

    const result = await syncSchedule(2026);

    expect(upsertWeek).toHaveBeenCalledTimes(2);
    expect(upsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ weekNumber: -1, isScoring: false })
    );
    expect(upsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ weekNumber: 1, isScoring: true })
    );
    expect(result).toEqual(
      expect.objectContaining({ ok: true, year: 2026, weeksProcessed: 2, gamesUpserted: 2 })
    );
  });
});

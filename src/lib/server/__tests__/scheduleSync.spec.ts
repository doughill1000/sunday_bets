import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { syncSchedule } from '../scheduleSync';
import { fetchEspnWeek } from '../schedule';
import { findTeamsByExternalKeys } from '../db/queries/findTeamsByExternalKeys';
import { upsertSeasonByYear } from '../db/commands/upsertSeasonByYear';
import { upsertWeek } from '../db/commands/upsertWeek';
import { upsertGameByMatchup } from '../db/commands/upsertGameByMatchup';

// Mock all dependencies of the scheduleSync module. A tiny week count keeps the
// loop short; the error classes back the instanceof guards in syncSchedule.
vi.mock('../schedule', () => ({
  fetchEspnWeek: vi.fn(),
  EspnFetchError: class EspnFetchError extends Error {},
  EspnParseError: class EspnParseError extends Error {},
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

describe('syncSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (findTeamsByExternalKeys as Mock).mockResolvedValue(TEAMS);
  });

  it('creates no season when no week returns games (issue #272)', async () => {
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

  it('creates the season once and upserts games when a week returns data', async () => {
    (upsertSeasonByYear as Mock).mockResolvedValue(99);
    (upsertWeek as Mock).mockResolvedValue(500);
    (upsertGameByMatchup as Mock).mockResolvedValue('game-uuid');

    // Week 1 has a game; the remaining weeks are empty.
    (fetchEspnWeek as Mock)
      .mockResolvedValueOnce({
        weekNumber: 1,
        games: [
          {
            scheduleGameId: 'e1',
            date: '2026-09-10T00:15Z',
            homeTeamAbbr: 'PHI',
            awayTeamAbbr: 'DAL',
            status: 'scheduled'
          }
        ]
      })
      .mockResolvedValue({ weekNumber: 2, games: [] });

    const result = await syncSchedule(2026);

    expect(upsertSeasonByYear).toHaveBeenCalledTimes(1);
    expect(upsertSeasonByYear).toHaveBeenCalledWith(2026);
    expect(upsertWeek).toHaveBeenCalledTimes(1);
    expect(upsertGameByMatchup).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({ ok: true, year: 2026, weeksProcessed: 1, gamesUpserted: 1 })
    );
  });
});

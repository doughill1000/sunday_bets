import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncOddsForActiveWeek } from '../oddsSync';
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from '../odds';
import { findActiveWeek } from '../db/queries/findActiveWeek';
import { findTeamsByNames } from '../db/queries/findTeamsByNames';
import { attachLineToMatchup } from '../db/commands/attachLineToMatchup';
import { setActiveLine } from '../db/commands/setActiveLine';
import { supabaseService } from '$lib/supabase/service';

// Mock all dependencies of the oddsSync module
vi.mock('../odds', () => ({
  fetchNFLSpreadsForWeek: vi.fn(),
  extractFanduelSpread: vi.fn()
}));

vi.mock('../db/queries/findActiveWeek', () => ({
  findActiveWeek: vi.fn()
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
      spreadValue: -3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: -3.5,
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
      spreadValue: -3.5
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
      spreadValue: -3.5
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: -3.5 }
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
      spreadValue: -4.0
    });
    (attachLineToMatchup as ReturnType<typeof vi.fn>).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: -3.5 }
    });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: -4.0,
      source: 'fanduel'
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1, unchanged: 0 }));
  });
});

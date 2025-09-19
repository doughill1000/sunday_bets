import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncOddsForActiveWeek } from '../oddsSync';
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from '../odds';
import { findActiveWeek } from '../db/queries/findActiveWeek';
import { findTeamsByNames } from '../db/queries/findTeamsByNames';
import { upsertGameByExternalId } from '../db/commands/upsertGameByExternalId';
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

vi.mock('../db/commands/upsertGameByExternalId', () => ({
  upsertGameByExternalId: vi.fn()
}));

vi.mock('../db/commands/setActiveLine', () => ({
  setActiveLine: vi.fn()
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
const mockMaybeSingle = (supabaseService as any).maybeSingle as ReturnType<typeof vi.fn>;

describe('syncOddsForActiveWeek', () => {
  beforeEach(() => {
    // Important: keep mock implementations (e.g., .mockReturnThis()) intact
    vi.clearAllMocks();
  });

  it('should return an error if no active week is found', async () => {
    (findActiveWeek as any).mockResolvedValue(null);

    const result = await syncOddsForActiveWeek();

    expect(result).toEqual({ ok: false, reason: 'No active week' });
  });

  it('should process a game and set a new line successfully', async () => {
    (findActiveWeek as any).mockResolvedValue({ id: 1, week_number: 1 });
    (fetchNFLSpreadsForWeek as any).mockResolvedValue([
      { id: 'ext-1', home_team: 'Team A', away_team: 'Team B' },
    ]);
    (findTeamsByNames as any).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' },
    ]);
    (extractFanduelSpread as any).mockReturnValue({ spreadTeamName: 'Team A', spreadValue: -3.5 });
    (upsertGameByExternalId as any).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: -3.5,
      source: 'fanduel',
    });
    expect(result).toEqual(
      expect.objectContaining({ ok: true, count: 1, unchanged: 0, skippedNoTeams: 0 }),
    );
  });

  it('should skip a game if a team is not found in the database', async () => {
    (findActiveWeek as any).mockResolvedValue({ id: 1, week_number: 1 });
    (fetchNFLSpreadsForWeek as any).mockResolvedValue([
      { id: 'ext-1', home_team: 'Team A', away_team: 'Team C' },
    ]);
    (findTeamsByNames as any).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' },
    ]);

    const result = await syncOddsForActiveWeek();

    expect(upsertGameByExternalId).not.toHaveBeenCalled();
    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, skippedNoTeams: 1, count: 0 }));
  });

  it('should skip setting a line if the new spread is identical to the active one', async () => {
    (findActiveWeek as any).mockResolvedValue({ id: 1, week_number: 1 });
    (fetchNFLSpreadsForWeek as any).mockResolvedValue([
      { id: 'ext-1', home_team: 'Team A', away_team: 'Team B' },
    ]);
    (findTeamsByNames as any).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' },
    ]);
    (extractFanduelSpread as any).mockReturnValue({ spreadTeamName: 'Team A', spreadValue: -3.5 });
    (upsertGameByExternalId as any).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: -3.5 },
    });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 0, unchanged: 1 }));
  });

  it('should update the line if the new spread is different from the active one', async () => {
    (findActiveWeek as any).mockResolvedValue({ id: 1, week_number: 1 });
    (fetchNFLSpreadsForWeek as any).mockResolvedValue([
      { id: 'ext-1', home_team: 'Team A', away_team: 'Team B' },
    ]);
    (findTeamsByNames as any).mockResolvedValue([
      { id: 10, name: 'Team A' },
      { id: 20, name: 'Team B' },
    ]);
    (extractFanduelSpread as any).mockReturnValue({ spreadTeamName: 'Team A', spreadValue: -4.0 });
    (upsertGameByExternalId as any).mockResolvedValue('game-uuid-1');
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'line-1', spread_team_id: 10, spread_value: -3.5 },
    });

    const result = await syncOddsForActiveWeek();

    expect(setActiveLine).toHaveBeenCalledWith({
      gameId: 'game-uuid-1',
      spreadTeamId: 10,
      spreadValue: -4.0,
      source: 'fanduel',
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1, unchanged: 0 }));
  });
});

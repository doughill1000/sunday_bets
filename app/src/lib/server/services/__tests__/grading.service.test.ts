import { describe, test, expect, vi, beforeEach } from 'vitest';
import { gradeGame, gradeWeek, gradeSeason } from '../grading.service';
import { supabaseService } from '$lib/supabase/service';
import { fetchNFLScores } from '../odds.service';
import type { OddsScore } from '$lib/types/oddsApi';

// Mock external dependencies
vi.mock('$lib/supabase/service');
vi.mock('../odds.service');

const mockSupabaseService = vi.mocked(supabaseService);
const mockFetchNFLScores = vi.mocked(fetchNFLScores);

// Test data factories
const createMockGame = (id: string, externalId = `ext-${id}`) => ({
  id,
  external_game_id: externalId,
  home_team: { name: 'Team A' },
  away_team: { name: 'Team B' }
});

const createMockScore = (id: string, homeScore = 24, awayScore = 17): OddsScore => ({
  id,
  completed: true,
  commence_time: '2024-01-01T00:00:00Z',
  sport_key: 'americanfootball_nfl',
  sport_title: 'NFL',
  home_team: 'Kansas City Chiefs',
  away_team: 'Buffalo Bills',
  last_update: '2024-01-01T01:00:00Z',
  scores: [
    { name: 'Kansas City Chiefs', score: homeScore },
    { name: 'Buffalo Bills', score: awayScore }
  ]
});

const mockSuccessfulRpc = () => {
  mockSupabaseService.rpc.mockResolvedValue({ error: null, data: null });
};

const mockRpcError = (message: string) => {
  mockSupabaseService.rpc.mockResolvedValue({ error: { message }, data: null });
};

const mockGamesQuery = (games: ReturnType<typeof createMockGame>[]) => {
  mockSupabaseService.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: games, error: null }),
      eq: vi.fn().mockResolvedValue({ data: games, error: null })
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    })
  } as any);
};

const mockQueryError = (message: string) => {
  mockSupabaseService.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message } })
    })
  } as any);
};

describe('grading.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gradeGame', () => {
    const gameId = 'test-game-id';

    test('should grade game without refreshing scores', async () => {
      mockSuccessfulRpc();

      const result = await gradeGame(gameId);

      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_game', { p_game_id: gameId });
      expect(result).toEqual({ ok: true, game_id: gameId });
      expect(mockFetchNFLScores).not.toHaveBeenCalled();
    });

    test('should refresh scores before grading when refreshScores is true', async () => {
      mockSuccessfulRpc();
      mockGamesQuery([createMockGame(gameId)]);
      mockFetchNFLScores.mockResolvedValue([]);

      await gradeGame(gameId, { refreshScores: true, daysFrom: 2 });

      expect(mockFetchNFLScores).toHaveBeenCalledWith(2);
      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_game', { p_game_id: gameId });
    });

    test('should throw error when RPC fails', async () => {
      const errorMessage = 'Database error';
      mockRpcError(errorMessage);

      await expect(gradeGame(gameId)).rejects.toThrow(errorMessage);
    });
  });

  describe('gradeWeek', () => {
    const weekId = 1;

    test('should grade week without refreshing scores', async () => {
      mockSuccessfulRpc();

      const result = await gradeWeek(weekId);

      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_week', { p_week_id: weekId });
      expect(result).toEqual({ ok: true, week_id: weekId });
      expect(mockFetchNFLScores).not.toHaveBeenCalled();
    });

    test('should refresh scores for all games in week before grading', async () => {
      const gameIds = ['game-1', 'game-2'];
      mockSuccessfulRpc();
      mockGamesQuery(gameIds.map((id) => createMockGame(id)));
      mockFetchNFLScores.mockResolvedValue([]);

      await gradeWeek(weekId, { refreshScores: true, daysFrom: 3 });

      expect(mockFetchNFLScores).toHaveBeenCalledWith(3);
      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_week', { p_week_id: weekId });
    });

    test('should handle database error when fetching games for week', async () => {
      const errorMessage = 'Failed to fetch games';
      mockQueryError(errorMessage);

      await expect(gradeWeek(weekId, { refreshScores: true })).rejects.toThrow(errorMessage);
    });
  });

  describe('gradeSeason', () => {
    const seasonId = 2025;

    test('should grade season without refreshing scores', async () => {
      mockSuccessfulRpc();

      const result = await gradeSeason(seasonId);

      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_season', {
        p_season_id: seasonId
      });
      expect(result).toEqual({ ok: true, season_id: seasonId });
      expect(mockFetchNFLScores).not.toHaveBeenCalled();
    });

    test('should refresh scores for all games in season before grading', async () => {
      const weekIds = [1, 2];
      const gameIds = ['game-1', 'game-2'];

      mockSuccessfulRpc();
      mockFetchNFLScores.mockResolvedValue([]);

      // Mock chained queries for weeks -> games
      mockSupabaseService.from.mockImplementation((table: string) => {
        if (table === 'weeks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: weekIds.map((id) => ({ id })),
                error: null
              })
            })
          } as any;
        }
        if (table === 'games') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: gameIds.map((id) => createMockGame(id)),
                error: null
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any;
        }
        return {} as any;
      });

      await gradeSeason(seasonId, { refreshScores: true, daysFrom: 7 });

      expect(mockFetchNFLScores).toHaveBeenCalledWith(7);
      expect(mockSupabaseService.rpc).toHaveBeenCalledWith('grade_season', {
        p_season_id: seasonId
      });
    });
  });

  describe('refreshScoresForGames integration', () => {
    test('should update final_scores when completed games are found', async () => {
      const gameId = 'game-1';
      const mockGame = createMockGame(gameId, 'ext-123');
      const mockScores = [createMockScore('ext-123')];

      mockSuccessfulRpc();
      mockGamesQuery([mockGame]);
      mockFetchNFLScores.mockResolvedValue(mockScores);

      await gradeGame(gameId, { refreshScores: true });

      expect(mockFetchNFLScores).toHaveBeenCalledWith(1);
      expect(mockSupabaseService.from).toHaveBeenCalledWith('games');
    });

    test('should handle empty game list gracefully', async () => {
      mockSuccessfulRpc();

      const result = await gradeGame('non-existent-game', { refreshScores: true });

      expect(result).toEqual({ ok: true, game_id: 'non-existent-game' });
    });
  });
});

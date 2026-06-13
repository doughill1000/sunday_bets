import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertGameByExternalId } from '../upsertGameByExternalId';
import { supabaseService } from '$lib/supabase/service';

vi.mock('$lib/supabase/service', () => ({
  supabaseService: { rpc: vi.fn() }
}));

// Provide a properly typed mock reference
const mockRpc = supabaseService.rpc as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertGameByExternalId command', () => {
  it('throws on rpc error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    await expect(
      upsertGameByExternalId({
        externalGameId: 'x',
        weekId: 1,
        commenceTime: '2024-01-01T00:00:00Z',
        homeTeamId: 1,
        awayTeamId: 2
      })
    ).rejects.toThrow('fail');
  });
  it('throws when rpc returns no id', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      upsertGameByExternalId({
        externalGameId: 'x',
        weekId: 1,
        commenceTime: '2024-01-01T00:00:00Z',
        homeTeamId: 1,
        awayTeamId: 2
      })
    ).rejects.toThrow(/returned no id/);
  });
  it('returns id when successful', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'uuid-123', error: null });
    const id = await upsertGameByExternalId({
      externalGameId: 'x',
      weekId: 1,
      commenceTime: '2024-01-01T00:00:00Z',
      homeTeamId: 1,
      awayTeamId: 2
    });
    expect(id).toBe('uuid-123');
  });
});

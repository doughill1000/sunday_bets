import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActiveLine } from '../setActiveLine';
// Now import the (mocked) service export
import { supabaseService } from '$lib/supabase/service';

vi.mock('$lib/supabase/service', () => ({
  supabaseService: { rpc: vi.fn() }
}));

const mockRpc = supabaseService.rpc as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setActiveLine command', () => {
  it('throws on rpc error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(
      setActiveLine({ gameId: 'g1', spreadTeamId: 1, spreadValue: -3.5, source: 'odds' })
    ).rejects.toThrow('boom');
  });
  it('throws on unexpected payload', async () => {
    mockRpc.mockResolvedValueOnce({ data: { something: 'else' }, error: null });
    await expect(
      setActiveLine({ gameId: 'g1', spreadTeamId: 1, spreadValue: -3.5, source: 'odds' })
    ).rejects.toThrow(/unexpected RPC payload/);
  });
  it('returns normalized first element when array', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          ok: true,
          deactivated: 1,
          line: {
            id: 1,
            game_id: 'g1',
            source: 'odds',
            spread_team_id: 1,
            spread_value: -3.5,
            is_active_line: true,
            fetched_at: '2024-01-01T00:00:00Z'
          }
        }
      ],
      error: null
    });
    const res = await setActiveLine({
      gameId: 'g1',
      spreadTeamId: 1,
      spreadValue: -3.5,
      source: 'odds'
    });
    expect(res.ok).toBe(true);
    expect(res.line.spread_value).toBe(-3.5);
  });
});

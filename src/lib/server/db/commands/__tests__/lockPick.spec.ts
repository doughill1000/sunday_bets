import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lockPick } from '../lockPick';
import type { TeamSide, WeightCode } from '$lib/types/domain';

function mockEvent(rpcImpl: (fn: string, args: any) => any) {
  return {
    locals: {
      supabase: { rpc: vi.fn(rpcImpl) }
    }
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lockPick command', () => {
  it('returns null when no rows', async () => {
    const event = mockEvent(() => ({ data: null, error: null }));
    const res = await lockPick(event, 'g1', 'home' as TeamSide, 'H' as WeightCode);
    expect(res).toBeNull();
  });

  it('throws user-friendly line unavailable error', async () => {
    const event = mockEvent(() => ({ data: null, error: { message: 'No active line for game' } }));
    await expect(lockPick(event, 'g1', 'home' as TeamSide, 'H' as WeightCode)).rejects.toThrow(/Line unavailable/);
  });

  it('propagates other errors', async () => {
    const event = mockEvent(() => ({ data: null, error: { message: 'DB timeout' } }));
    await expect(lockPick(event, 'g1', 'home' as TeamSide, 'H' as WeightCode)).rejects.toThrow('DB timeout');
  });

  it('normalizes array result to first row', async () => {
    const event = mockEvent(() => ({ data: [{ ok: true, user_id: 'u1', game_id: 'g1', picked_side: 'home', weight: 'H', locked_at: '2024-01-01T00:00:00Z' }], error: null }));
    const res = await lockPick(event, 'g1', 'home' as TeamSide, 'H' as WeightCode);
    expect(res).toEqual({ ok: true, user_id: 'u1', game_id: 'g1', picked_side: 'home', weight: 'H', locked_at: '2024-01-01T00:00:00Z' });
  });

  it('maps locked_at -> locked_at', async () => {
    const locked_at = '2025-09-27T12:34:56.000Z';
    const event = mockEvent(() => ({ data: [{ ok: true, user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', game_id: '11111111-1111-1111-1111-111111111111', picked_side: 'home', weight: 'L', locked_at }], error: null }));
    const result = await lockPick(
      event,
      '11111111-1111-1111-1111-111111111111',
      'home' as TeamSide,
      'L' as WeightCode
    );
    expect(result).toMatchObject({ ok: true, locked_at });
  });
});
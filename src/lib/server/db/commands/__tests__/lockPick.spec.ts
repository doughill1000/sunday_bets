import { describe, it, expect, vi } from 'vitest';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import { lockPick } from '../lockPick';

function mockEvent(row: any) {
  return {
    locals: {
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: [row],
          error: null
        })
      }
    }
  } as any;
}

describe('lockPick command', () => {
  it('maps locked_at -> locked_at', async () => {
    const locked_at = '2025-09-27T12:34:56.000Z';
    const event = mockEvent({
      ok: true,
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      game_id: '11111111-1111-1111-1111-111111111111',
      picked_side: 'home',
      weight: 'L',
      locked_at
    });
    const result = await lockPick(
      event,
      '11111111-1111-1111-1111-111111111111',
      'home' as TeamSide,
      'L' as WeightCode
    );
    // After you adjust implementation to return locked_at
    expect(result).toMatchObject({
      ok: true,
      locked_at
    });
  });
});
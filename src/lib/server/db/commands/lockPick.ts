// src/lib/server/commands/lock_pick.ts
import type { TeamSide, WeightCode } from '$lib/types/domain';
import type { LockPickResult } from '$lib/types/server/picks';
import type { RequestEvent } from '@sveltejs/kit';
import type { Database } from '../../../types/supabase';

export async function lockPick(
  event: RequestEvent,
  gameId: string,
  side: TeamSide,
  weight: WeightCode
): Promise<LockPickResult> {
  const supabase = event.locals.supabase;

  type LockPickRows = Database['public']['Functions']['lock_pick']['Returns'];

  const { data, error } = await supabase.rpc('lock_pick', {
    p_game_id: gameId,
    p_side: side,
    p_weight: weight
  });

  const rows = data as LockPickRows | null;

  if (error) {
    // Make the "line required" path user-friendly
    if (/no active line/i.test(error.message)) {
      throw new Error('Line unavailable for this game right now. Try again shortly.');
    }
    throw error;
  }

  // RPC returns SETOF; normalize to single row or null
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;

  // Map the database result to the expected API response shape.
  return {
    ok: row.ok,
    user_id: row.user_id,
    game_id: row.game_id,
    picked_side: row.picked_side as TeamSide,
    weight: row.weight as WeightCode,
    locked_at: row.locked_at
  };
}

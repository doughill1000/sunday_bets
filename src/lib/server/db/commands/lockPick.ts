import type { RequestEvent } from '@sveltejs/kit';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export async function lockPick(
  event: RequestEvent,
  gameId: string,
  team: TeamSide,
  weight: WeightCode
) {
  const supabase = event.locals.supabase;

  const { data, error } = await supabase.rpc('lock_pick', {
    p_game_id: gameId,
    p_side: team,
    p_weight: weight
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

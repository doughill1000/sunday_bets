import { createSSRClient } from '$lib/supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export async function lockPick(
  event: RequestEvent,
  gameId: string,
  team: TeamSide,
  weight: WeightCode
) {
  const supabase = createSSRClient(event);

  // Use an RPC or insert logic as needed
  const { error } = await supabase.rpc('lock_pick', {
    game_id: gameId,
    picked_team: team,
    weight
  });

  if (error) throw error;
}

import { createSSRClient } from '$lib/supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export async function unlockPick(event: RequestEvent, gameId: string) {
  const supabase = createSSRClient(event);

  // Use an RPC or update logic as needed
  const { error } = await supabase.rpc('unlock_pick', {
    game_id: gameId
  });

  if (error) throw error;
}

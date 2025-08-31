import { createSSRClient } from '$lib/supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export async function findUserPickForGame(
  event: Pick<RequestEvent, 'cookies'>,
  gameId: string
) {
  const supabase = createSSRClient(event);

  const { data, error } = await supabase
    .from('picks_view')
    .select('*')
    .eq('game_id', gameId)
    .limit(1)
    .single();

  if (error) throw error;
  return data ?? null;
}

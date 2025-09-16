import type { RequestEvent } from '@sveltejs/kit';

export async function findUserPickForGame(event: RequestEvent, gameId: string) {
  const supabase = event.locals.supabase;

  const { data, error } = await supabase
    .from('picks_status_view_user') // <-- user-scoped view
    .select('*')
    .eq('game_id', gameId)
    .limit(1)
    .single();

  if (error) throw error;
  return data ?? null;
}

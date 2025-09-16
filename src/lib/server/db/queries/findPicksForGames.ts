import { supabaseService } from '$lib/supabase/service';

export async function findPicksForGames(gameIds: string[]) {
  if (!gameIds.length) return [];
  const { data, error } = await supabaseService
    .from('picks_status_view_admin')
    .select('*')
    .in('game_id', gameIds);

  if (error) throw error;
  return data ?? [];
}

import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function findPicksForGames(gameIds: (string | number)[]) {
  if (!gameIds.length) return [];
  const { data, error } = await supabase.from('picks_view').select('*').in('game_id', gameIds);

  if (error) throw error;
  return data ?? [];
}

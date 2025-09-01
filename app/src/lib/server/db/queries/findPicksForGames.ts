import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function findPicksForGames(gameIds: string[]) {
  if (!gameIds.length) return [];
  const { data, error } = await supabase
    .from('picks_status_view')
    .select('*')
    .in(
      'game_id',
      gameIds.map((id) => (id !== null ? id : null))
    );

  if (error) throw error;
  return data ?? [];
}

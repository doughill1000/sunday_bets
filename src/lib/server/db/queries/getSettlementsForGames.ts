import { supabaseService } from '$lib/supabase/service';


export function getSettlementsForGames(gameIds: string[]) {
  return supabaseService.from('pick_settlement').select('user_id, game_id, points_delta, outcome').in('game_id', gameIds);
}

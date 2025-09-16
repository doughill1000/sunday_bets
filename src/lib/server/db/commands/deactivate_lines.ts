import { supabaseService } from '$lib/supabase/service';

export async function deactivateActiveLines(gameId: string) {
  const { error } = await supabaseService
    .from('game_lines')
    .update({ is_active_line: false })
    .eq('game_id', gameId)
    .eq('is_active_line', true);

  if (error) throw error;
}

import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function deactivateActiveLines(gameId: string) {
  const { error } = await supabase
    .from('game_lines')
    .update({ is_active_line: false })
    .eq('game_id', gameId)
    .eq('is_active_line', true);

  if (error) throw error;
}

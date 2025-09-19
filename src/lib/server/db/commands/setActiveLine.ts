import { supabaseService } from '$lib/supabase/service';

/**
 * Deactivates the current active tick for (game_id, source) and inserts a new active line.
 * Returns the new game_lines.id
 */
export async function setActiveLine(params: {
  gameId: string;
  source?: string;              // default 'fanduel'
  spreadTeamId: number;
  spreadValue: number;
}): Promise<number> {
  const { gameId, spreadTeamId, spreadValue, source = 'fanduel' } = params;

  const { data, error } = await supabaseService.rpc('set_active_line', {
    p_game_id: gameId,
    p_source: source,
    p_spread_team_id: spreadTeamId,
    p_spread_value: spreadValue
  });

  if (error) throw error;
  // RPC returns table(id int) – normalize to a number
  const id = Array.isArray(data) ? data[0]?.id : (data as any)?.id;
  if (!id && id !== 0) throw new Error('set_active_line: RPC returned no id');
  return id as number;
}

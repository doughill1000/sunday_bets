// src/lib/server/db/queries/listGamesWithActiveLine.ts
import { createSupabaseService } from '$lib/supabase/service';

export async function listGamesWithActiveLineRaw(weekId: number) {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      id,
      week_id,
      commence_time,
      status,
      home_team:home_team_id ( id, name, short_name ),
      away_team:away_team_id ( id, name, short_name ),
      game_lines!inner ( id, spread_team_id, spread_value, source, is_active_line )
    `
    )
    .eq('week_id', weekId)
    .eq('game_lines.is_active_line', true)
    .order('commence_time', { ascending: true });

  if (error) throw new Error(`listGamesWithActiveLineRaw failed: ${error.message}`);
  return data ?? [];
}

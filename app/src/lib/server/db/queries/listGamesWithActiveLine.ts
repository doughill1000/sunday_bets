import { supabaseService } from '$lib/supabase/service';

export async function listGamesWithActiveLine(weekId: number) {
  const { data, error } = await supabaseService
    .from('games')
    .select(
      `
      id,
      week_id,
      commence_time,
      status,
      home_team:teams!home_team_id ( id, name, short_name ),
      away_team:teams!away_team_id ( id, name, short_name ),
      game_lines!inner ( id, spread_team_id, spread_value, source, is_active_line, fetched_at )
    `
    )
    .eq('week_id', weekId)
    .eq('game_lines.is_active_line', true)
    // constrain nested relation to one row (still comes back as an array)
    .limit(1, { foreignTable: 'game_lines' })
    .order('commence_time', { ascending: true });

  if (error) throw new Error(`listGamesWithActiveLine failed: ${error.message}`);
  return data ?? [];
}

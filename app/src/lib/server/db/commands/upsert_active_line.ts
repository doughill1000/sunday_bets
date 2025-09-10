// db/commands/upsert_active_line.ts
import { supabaseService } from '$lib/supabase/service';

export async function upsertActiveLine(
  gameId: string,
  spreadTeamId: number,
  spreadValue: number,
  source = 'fanduel'
) {
  const { error } = await supabaseService.from('game_lines').upsert(
    [
      {
        game_id: gameId,
        source,
        spread_team_id: spreadTeamId,
        spread_value: spreadValue,
        fetched_at: new Date().toISOString(),
        is_active_line: true
      }
    ],
    { onConflict: 'game_id,source' }
  );

  if (error) throw error;
}

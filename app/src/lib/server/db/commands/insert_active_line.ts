import { supabaseService } from '$lib/supabase/service';

export async function insertActiveLine(gameId: string, spreadTeamId: number, spreadValue: number) {
  const { error } = await supabaseService.from('game_lines').insert([
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: spreadTeamId,
      spread_value: spreadValue,
      fetched_at: new Date().toISOString(),
      is_active_line: true
    }
  ]);

  if (error) throw error;
}

import { createSupabaseService } from '$lib/supabase/service';
import type { OddsGame, TeamRow } from '$lib/types/server';

const supabase = createSupabaseService();

export async function upsertGame(g: OddsGame, home: TeamRow, away: TeamRow, weekId: number): Promise<string> {
  // Try to upsert the game by external_game_id and week_id
  const { data, error } = await supabase
    .from('games')
    .upsert(
      [
        {
          week_id: weekId,
          external_game_id: g.id,
          commence_time: g.commence_time,
          home_team_id: home.id,
          away_team_id: away.id,
          status: 'scheduled'
        }
      ],
      { onConflict: 'external_game_id,week_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data?.id;
}

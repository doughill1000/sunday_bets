// src/lib/server/db/queries/getGamesWithActiveLines.ts
import { supabaseService } from '$lib/supabase/service';
import type { UIGame } from '$lib/types/ui';
import type { Database } from '$lib/types/supabase';

type UIGameRow = Database['public']['Views']['ui_games']['Row'];

export async function getGamesWithActiveLines(weekId: number): Promise<UIGame[]> {
  const { data, error } = await supabaseService
    .from('ui_games')
    .select(
      'id, week_id, kickoff, home, away, home_team_id, away_team_id, spread_value, favorite_team_id'
    )
    .eq('week_id', weekId)
    .order('kickoff');

  if (error) throw error;
  return ((data as UIGameRow[] | null) ?? []).map((g) => ({
    id: g.id as string,
    kickoff: g.kickoff as string,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    home: g.home as string,
    away: g.away as string,
    spreadTeamId: g.favorite_team_id,
    spreadValue: g.spread_value
  }));
}

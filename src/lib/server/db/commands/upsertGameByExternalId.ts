import { supabaseService } from '$lib/supabase/service';

export async function upsertGameByExternalId(params: {
  externalGameId: string; // Odds API game id
  weekId: number;
  commenceTime: string; // ISO
  homeTeamId: number;
  awayTeamId: number;
}): Promise<string> {
  const { externalGameId, weekId, commenceTime, homeTeamId, awayTeamId } = params;

  const { data, error } = await supabaseService.rpc('upsert_game_by_external_id', {
    p_external_game_id: externalGameId,
    p_week_id: weekId,
    p_commence: commenceTime,
    p_home_team_id: homeTeamId,
    p_away_team_id: awayTeamId
  });

  if (error) throw error;
  if (!data) throw new Error('upsert_game_by_external_id: RPC returned no id');
  return data as string; // uuid
}

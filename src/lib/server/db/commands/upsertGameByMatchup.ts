import { supabaseService } from '$lib/supabase/service';

export async function upsertGameByMatchup(params: {
  weekId: number;
  homeTeamId: number;
  awayTeamId: number;
  commenceTime: string;
  scheduleGameId: string;
  status: string;
}): Promise<string> {
  const { weekId, homeTeamId, awayTeamId, commenceTime, scheduleGameId, status } = params;

  const { data, error } = await supabaseService.rpc('upsert_game_by_matchup', {
    p_week_id: weekId,
    p_home_team_id: homeTeamId,
    p_away_team_id: awayTeamId,
    p_commence: commenceTime,
    p_schedule_game_id: scheduleGameId,
    p_status: status
  });

  if (error) throw error;
  if (!data) throw new Error('upsert_game_by_matchup: RPC returned no id');
  return data as string;
}

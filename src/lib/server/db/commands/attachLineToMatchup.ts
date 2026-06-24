import { supabaseService } from '$lib/supabase/service';

export async function attachLineToMatchup(params: {
  weekId: number;
  homeTeamId: number;
  awayTeamId: number;
  externalGameId: string;
}): Promise<string | null> {
  const { weekId, homeTeamId, awayTeamId, externalGameId } = params;

  const { data, error } = await supabaseService.rpc('attach_line_to_matchup', {
    p_week_id: weekId,
    p_home_team_id: homeTeamId,
    p_away_team_id: awayTeamId,
    p_external_game_id: externalGameId
  });

  if (error) throw error;
  return (data as string | null) ?? null;
}

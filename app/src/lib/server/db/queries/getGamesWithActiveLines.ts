import { createSupabaseService } from '$lib/supabase/service';
import type { TeamSide } from '$lib/types/domain';

const supabase = createSupabaseService();

export async function getGamesWithActiveLines(weekId: number) {
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      id,
      external_game_id,
      commence_time,
      home_team:teams!home_team_id (
        id,
        name,
        short_name
      ),
      away_team:teams!away_team_id (
        id,
        name,
        short_name
      ),
      game_lines (
        id,
        spread_team_id,
        spread_value,
        source,
        is_active_line
      )
    `
    )
    .eq('week_id', weekId);

  if (error) throw error;
  if (!data) return [];

  return data
    .map((g) => {
      const lines = Array.isArray(g.game_lines) ? g.game_lines : [g.game_lines].filter(Boolean);
      const activeLine = lines.find((l) => l.is_active_line) ?? null;

      if (!activeLine) return null;

      return {
        game_id: g.id,
        external_game_id: g.external_game_id,
        kickoff: g.commence_time,
        home_code: g.home_team?.short_name,
        home_name: g.home_team?.name,
        away_code: g.away_team?.short_name,
        away_name: g.away_team?.name,
        spread_team: activeLine.spread_team_id === g.home_team?.id ? 'home' : 'away' as TeamSide,
        spread_value: activeLine.spread_value,
        line_source: activeLine.source
      };
    })
    .filter((g) => g !== null);
}

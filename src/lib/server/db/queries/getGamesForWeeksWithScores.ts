// src/lib/server/db/queries/games.ts
import { supabaseService } from '$lib/supabase/service';

export async function getGamesForWeeksWithScores(weekIds: number[]) {
  // Label: "AWY @ HOM" + score if final, plus the game's line for the /week card header (#836).
  //
  // The `game_lines` embed is deliberately NOT `!inner` (contrast `listGamesWithActiveLine`):
  // a game with no line was never pickable (#802/#803) but still has to render its card, and an
  // inner join would drop it from the week entirely. `game_lines` is append-only, so the nested
  // filter keeps this to the at-most-one-per-source closing rows plus the single active row
  // rather than every historical snapshot; `assembleWeeklyBreakdown` picks the one to show.
  return supabaseService
    .from('games')
    .select(
      `
      id,
      week_id,
      commence_time,
      final_scores,
      home_team_id,
      away_team_id,
      home:home_team_id(short_name),
      away:away_team_id(short_name),
      game_lines(spread_team_id, spread_value, source, is_closing_line, is_active_line, fetched_at)
    `
    )
    .in('week_id', weekIds)
    .or('is_closing_line.eq.true,is_active_line.eq.true', { referencedTable: 'game_lines' })
    .order('commence_time', { ascending: true });
}

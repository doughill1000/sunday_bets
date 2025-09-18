// src/lib/server/db/queries/games.ts
import { supabaseService } from '$lib/supabase/service';

export async function getGamesForWeeksWithScores(weekIds: number[]) {
  // Label: "AWY @ HOM" + score if final
  return supabaseService
    .from('games')
    .select(
      `
      id,
      week_id,
      commence_time,
      final_scores,
      home:home_team_id(short_name),
      away:away_team_id(short_name)
    `
    )
    .in('week_id', weekIds)
    .order('commence_time', { ascending: true });
}

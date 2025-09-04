import { supabaseService } from '$lib/supabase/service';
import { getGamesWithActiveLines } from './getGamesWithActiveLines';

export async function getActiveWeekGames() {
  const now = new Date().toISOString();

  // Find the current active week
  let { data: week, error } = await supabaseService
    .from('weeks')
    .select('id, start_ts, end_ts')
    .lte('start_ts', now)
    .gte('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .single();

  if (error || !week) {
    // Fallback: most recent week that has started
    const fallback = await supabaseService
      .from('weeks')
      .select('id, start_ts, end_ts')
      .lte('start_ts', now)
      .order('start_ts', { ascending: false })
      .limit(1)
      .single();
    week = fallback.data;
  }

  if (!week) return [];

  return getGamesWithActiveLines(week.id);
}

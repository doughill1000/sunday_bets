// src/lib/server/db/queries/getActiveWeekGames.ts
import { supabaseService } from '$lib/supabase/service';
import { getGamesWithActiveLines } from './getGamesWithActiveLines';

export async function getActiveWeekGames() {
  const now = new Date().toISOString();

  // Try explicit "active window" first…
  const { data: weekData, error } = await supabaseService
    .from('weeks')
    .select('id, start_ts, end_ts')
    .lte('start_ts', now)
    .gte('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .single();

  let week = weekData;

  // …fallback to latest started week
  if (error || !week) {
    const fallback = await supabaseService
      .from('weeks')
      .select('id, start_ts, end_ts')
      .lte('start_ts', now)
      .order('start_ts', { ascending: false })
      .limit(1)
      .single();
    week = fallback.data ?? null;
  }

  if (!week) return [];
  return getGamesWithActiveLines(week.id);
}

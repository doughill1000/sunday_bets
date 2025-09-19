import { supabaseService } from '$lib/supabase/service';
import type { SeasonTotalsRow, WeeklyCumulativeRow } from '$lib/types/server/leaderboard';

export async function getCurrentSeasonYear(): Promise<number> {
  const { data, error } = await supabaseService
    .from('current_season_year')
    .select('season_year')
    .single();
  if (error) throw error;
  return data!.season_year as number;
}

export async function getSeasonLeaderboard(seasonYear: number): Promise<SeasonTotalsRow[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_season_totals')
    .select('*')
    .eq('season_year', seasonYear)
    .order('rank', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeasonTotalsRow[];
}

export async function getWeeklyCumulative(seasonYear: number): Promise<WeeklyCumulativeRow[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_weekly_cumulative')
    .select('*')
    .eq('season_year', seasonYear)
    .order('week_number', { ascending: true })
    .order('cumulative_rank_this_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyCumulativeRow[];
}

import { supabaseService } from '$lib/supabase/service';
import type { SeasonLeaderboardEntry, WeeklyCumulativeEntry } from '$lib/types/leaderboard';

export async function getCurrentSeasonYear(): Promise<number> {
  const { data, error } = await supabaseService
    .from('current_season_year')
    .select('season_year')
    .single();
  if (error) throw error;
  return data!.season_year as number;
}

export async function getSeasonLeaderboard(seasonYear: number): Promise<SeasonLeaderboardEntry[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_season_totals')
    .select('*')
    .eq('season_year', seasonYear)
    .order('rank', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeasonLeaderboardEntry[];
}

export async function getWeeklyCumulative(seasonYear: number): Promise<WeeklyCumulativeEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_season_trend')
    .select('*')
    .eq('season_year', seasonYear)
    .order('week_number', { ascending: true })
    .order('cumulative_rank_this_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyCumulativeEntry[];
}

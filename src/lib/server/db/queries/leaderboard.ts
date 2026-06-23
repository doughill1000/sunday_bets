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

export async function getSeasonLeaderboard(
  seasonYear: number,
  groupId: string
): Promise<SeasonLeaderboardEntry[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_season_totals')
    .select('*')
    .eq('season_year', seasonYear)
    .eq('group_id', groupId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeasonLeaderboardEntry[];
}

export async function getAvailableSeasons(groupId: string): Promise<number[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_season_totals')
    .select('season_year')
    .eq('group_id', groupId)
    .order('season_year', { ascending: false });
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.season_year as number))].sort((a, b) => b - a);
}

export async function getWeeklyCumulative(
  seasonYear: number,
  groupId: string
): Promise<WeeklyCumulativeEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_season_trend')
    .select('*')
    .eq('season_year', seasonYear)
    .eq('group_id', groupId)
    .order('week_number', { ascending: true })
    .order('cumulative_rank_this_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyCumulativeEntry[];
}

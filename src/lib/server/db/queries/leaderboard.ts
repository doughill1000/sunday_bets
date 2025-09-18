import { supabaseService } from '$lib/supabase/service';

export type SeasonTotalsRow = {
  user_id: string;
  display_name: string;
  season_year: number;
  total_points: number;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
  rank: number;
};

type WeekPicksRow = {
  week_number: number;
  user_id: string;
  display_name: string;
  weight: 'L'|'M'|'H'|'A'|number;
  team: string;
  result: 'W'|'L'|'P'|'M';
  week_points: number;
};

export type WeeklyCumulativeRow = {
  user_id: string;
  display_name: string;
  season_year: number;
  week_number: number;
  week_points: number;
  week_wins: number;
  week_losses: number;
  week_pushes: number;
  week_missed: number;
  cumulative_points: number;
  season_total: number;
  cumulative_rank_this_week: number;
};

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

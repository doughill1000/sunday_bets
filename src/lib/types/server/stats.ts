import type { WeightCode } from '$lib/types/domain';

export type SeasonTrendEntry = {
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

export type TeamAccuracyEntry = {
  user_id: string;
  display_name: string;
  season_year: number;
  team_id: number;
  team_name: string;
  team_short_name: string;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  accuracy: number | null;
};

export type WeightAccuracyEntry = {
  user_id: string;
  display_name: string;
  season_year: number;
  weight: WeightCode;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  accuracy: number | null;
};

export type HeadToHeadEntry = {
  user_id: string;
  display_name: string;
  opponent_user_id: string;
  opponent_display_name: string;
  season_year: number;
  games_compared: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  opponent_points: number;
};

export type SeasonStats = {
  trend: SeasonTrendEntry[];
  teamAccuracy: TeamAccuracyEntry[];
  weightAccuracy: WeightAccuracyEntry[];
  headToHead: HeadToHeadEntry[];
};

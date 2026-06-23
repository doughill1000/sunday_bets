import type { ShortResult } from '$lib/constants/picks';
import type { GameResult, WeightCode } from './domain';

export type LeaderboardPlayer = { id: string; display_name: string; avatar_key?: string | null };

export type LeaderboardPickCell = {
  weight: WeightCode | null;
  team: string | null;
  result: ShortResult | null;
  spread: string | null;
};

export type WeeklyLeaderboard = {
  games: WeeklyLeaderboardGame[];
  cells: Record<string, Record<string, LeaderboardPickCell>>;
};

export type WeeklyLeaderboardGame = {
  game_id: string;
  label: string;
  score: string | null;
  isFinal: boolean;
};

/** Non-null application contract shaped from leaderboard_season_totals. */
export type SeasonLeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  season_year: number;
  total_points: number;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
  rank: number;
};

/** Non-null application contract shaped from leaderboard_weekly_cumulative. */
export type WeeklyCumulativeEntry = {
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

export type Settlement = {
  user_id: string;
  game_id: string;
  points_delta: number | null;
  outcome: GameResult | null;
};

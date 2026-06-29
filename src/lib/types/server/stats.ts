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
  games_compared: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  opponent_points: number;
};

export type ConsensusStatsEntry = {
  user_id: string;
  display_name: string;
  /** Total non-missed picks in scoring rounds for the season. */
  decisions: number;
  /** Average consensus_pct across all picks (0–100). */
  mean_consensus_pct: number;
  /** Count of picks where the user was in the minority (consensus_pct < 50). */
  contrarian_picks: number;
  /** Minority picks that graded as wins. */
  contrarian_wins: number;
  /** Count of picks where the user was with the majority (!is_minority). */
  majority_picks: number;
  /** Majority picks that graded as wins. */
  majority_wins: number;
};

export type SeasonStats = {
  trend: SeasonTrendEntry[];
  teamAccuracy: TeamAccuracyEntry[];
  weightAccuracy: WeightAccuracyEntry[];
  headToHead: HeadToHeadEntry[];
  /** Per-user consensus aggregates for Tier-B badge derivation (#294). */
  consensusStats: ConsensusStatsEntry[];
};

export type AllTimeTotalsEntry = {
  user_id: string;
  display_name: string;
  total_points: number;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
};

export type AllTimeTeamAccuracyEntry = {
  user_id: string;
  display_name: string;
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

export type AllTimeWeightAccuracyEntry = {
  user_id: string;
  display_name: string;
  weight: WeightCode;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  accuracy: number | null;
};

export type AllTimeStats = {
  allTimeTotals: AllTimeTotalsEntry[];
  allTimeTeamAccuracy: AllTimeTeamAccuracyEntry[];
  allTimeWeightAccuracy: AllTimeWeightAccuracyEntry[];
  allTimeHeadToHead: HeadToHeadEntry[];
};

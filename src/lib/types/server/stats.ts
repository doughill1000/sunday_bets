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
  /** True for the single week drop-worst-week (ADR-0018) forgave, if active for this
   *  (group, season). week_points/cumulative_points/season_total stay raw regardless —
   *  this only marks which week a Leaderboard standings total dropped. */
  is_dropped_week: boolean;
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

/** Per-user favorite-vs-underdog pick mix for the Chalk Eater / Dog Lover badges (#317). */
export type LineSideStatsEntry = {
  user_id: string;
  display_name: string;
  /** Total non-missed picks in scoring rounds (denominator for both ratios). */
  decisions: number;
  /** Picks on the spread favorite (line at pick time). */
  chalk_picks: number;
  /** Picks on the spread underdog (line at pick time). */
  dog_picks: number;
};

/** Per-player streak data from stats_pick_streaks for the Hot Hand badge (#296). */
export type StreakStatsEntry = {
  user_id: string;
  display_name: string;
  /** Non-push graded picks (wins + losses + missed) — used by the sample guard. */
  graded_picks: number;
  /** Consecutive wins ending at the most recent graded pick (provisional metric). */
  current_streak: number;
  /** Longest consecutive win run achieved in the season (crowned metric). */
  max_streak: number;
};

export type SeasonStats = {
  trend: SeasonTrendEntry[];
  teamAccuracy: TeamAccuracyEntry[];
  weightAccuracy: WeightAccuracyEntry[];
  headToHead: HeadToHeadEntry[];
  /** Per-user consensus aggregates for Tier-B badge derivation (#294). */
  consensusStats: ConsensusStatsEntry[];
  /** Per-user favorite-vs-underdog pick mix for line-side badges (#317). */
  lineSide: LineSideStatsEntry[];
  /** Per-user streak data for Tier-C Hot Hand badge (#296). */
  streaks: StreakStatsEntry[];
};

export type AllTimeTotalsEntry = {
  user_id: string;
  display_name: string;
  /** Sum of each season's drop-aware standings total (ADR-0018) — equals the sum of
   *  this player's per-season leaderboard cards, regardless of drop_worst_week state. */
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

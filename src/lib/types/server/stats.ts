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

/** The four situational cuts the "Your edge" panel (#502) works over. Kept in sync with
 *  stats_situational_splits.dimension and league_situational_baseline.dimension. */
export type SituationalDimension = 'primetime' | 'home_away' | 'spread' | 'divisional';

/** One per-user career situational ATS record from stats_situational_splits (#502) — the
 *  player's own cover rate in a cut, joined against the league baseline to compute their edge.
 *  Career-grain (all seasons pooled); `accuracy` is wins/(wins+losses), null on a no-decision cut. */
export type SituationalSplitEntry = {
  user_id: string;
  dimension: SituationalDimension;
  bucket: string;
  bucket_order: number;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  accuracy: number | null;
};

/** One league-wide market ATS cover baseline row from league_situational_baseline (#502) — how
 *  often a side taken in that cut covers, at the same backed-side grain as SituationalSplitEntry,
 *  so the panel can subtract it apples-to-apples. Group-independent. */
export type LeagueSituationalBaselineEntry = {
  dimension: SituationalDimension;
  bucket: string;
  bucket_order: number;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  accuracy: number | null;
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

import type { GameResult, TeamSide, WeightCode } from './domain';

export type LeaderboardPlayer = { id: string; display_name: string; avatar_key?: string | null };

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
  /** True for the single week drop-worst-week (ADR-0018) forgave, if active for this
   *  (group, season). week_points/cumulative_points/season_total stay raw regardless —
   *  this only marks which week a Leaderboard standings total dropped. */
  is_dropped_week: boolean;
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

// isScoring=false marks a non-scoring round (preseason / practice, ADR-0016): pickable and
// shown with graded results, but excluded from standings/stats and labelled in the UI.
export type SeasonWeekOption = { weekNumber: number; weekId: number; isScoring: boolean };

export type WeeklyPickRow = {
  userId: string;
  displayName: string;
  avatarKey: string | null;
  isYou: boolean;
  pickedSide: TeamSide | null;
  pickedTeamShort: string | null;
  weight: WeightCode | null;
  outcome: GameResult | 'missed' | null;
  pointsDelta: number | null;
  // Frozen-at-lock inputs that let the client mirror grade_pick against the live ESPN score
  // for the display-only weekly sweat board (#584). Always come from picks_group_view via
  // getGroupPicks; null on a no-pick row. Grading/settlement stay the sole authority.
  pickedTeamId: number | null;
  lockedSpreadValue: number | null;
  lockedSpreadTeamId: number | null;
};

export type WeeklyGameBreakdown = {
  gameId: string;
  away: string;
  home: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
  isFinal: boolean;
  // Raw team ids (not just the short-name join) so the client can join the live score onto the
  // right side and evaluate liveCoverState for each pick (#584).
  homeTeamId: number | null;
  awayTeamId: number | null;
  picks: WeeklyPickRow[];
};

/**
 * One player's provisional standing on the Weekly tab's live sweat board (#584): their
 * week-so-far points, combining graded settlement where the grade cron has run with a
 * display-only live projection (mirror of grade_pick) for games still in progress or
 * final-but-ungraded. Reorders live and converges to the graded weekly order once every game
 * settles. Display-only — never a settlement authority.
 */
export type WeeklyLiveStanding = {
  userId: string;
  displayName: string;
  avatarKey: string | null;
  isYou: boolean;
  /** Week-so-far points: Σ graded points_delta + Σ live provisional (+weight / −weight / 0). */
  points: number;
  /** How many of this member's picks already have a result (graded or a live score). */
  decided: number;
  /** How many revealed picks this member has this week (the denominator in "N of M in"). */
  pickCount: number;
  /** True when at least one contributing game is still live/unofficial (not yet graded). */
  hasLive: boolean;
  /** Competition rank (1-based; ties share a rank). */
  rank: number;
};

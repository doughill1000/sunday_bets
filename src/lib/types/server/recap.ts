export type SpiceLevel = 'mild' | 'medium' | 'spicy';

export type RecapPlayer = {
  user_id: string;
  display_name: string;
};

// Resurfaced bad takes (#295). Severity order: lost_allin > backfired_fade > heavy_loss.
export type BadTakeKind = 'lost_allin' | 'backfired_fade' | 'heavy_loss';

export type RecapBadTake = RecapPlayer & { kind: BadTakeKind };

// Top active rivalry pair from the lifetime head-to-head read-model (#280).
export type RecapRivalry = {
  player_a: RecapPlayer;
  player_b: RecapPlayer;
  a_wins: number;
  b_wins: number;
  pushes: number;
  games: number;
};

// ── Storyline facts (week-over-week drama, not rank order) ──────────────────────
// Derived from stats_season_trend.cumulative_rank_this_week and stats_pick_streaks.

/** Week-over-week rank movement. delta = from_rank − to_rank (positive = climbed). */
export type RecapRankMover = RecapPlayer & { from_rank: number; to_rank: number; delta: number };

/** A new player overtook #1 in the season standings vs the prior week. */
export type RecapLeadChange = { new_leader: RecapPlayer; old_leader: RecapPlayer };

/** A live win streak (consecutive wins ending at the most recent graded pick). */
export type RecapStreak = RecapPlayer & { streak: number };

/** Tightness at the top: margin = points between #1 and #2 (0 = dead heat). */
export type RecapTitleRace = { leader: RecapPlayer; runner_up: RecapPlayer; margin: number };

export type RecapFacts = {
  group_id: string;
  group_name: string;
  season_year: number;
  week_number: number;
  is_final_week: boolean;
  spice: SpiceLevel;
  opted_out_user_ids: string[];
  // Week results
  week_leader: (RecapPlayer & { points: number }) | null;
  week_laggard: (RecapPlayer & { points: number }) | null;
  perfect_weeks: RecapPlayer[];
  // All-in picks (weight = 'A')
  allin_hero: (RecapPlayer & { consensus_pct?: number }) | null;
  allin_zero: (RecapPlayer & { consensus_pct?: number }) | null;
  // Most contrarian hit: a minority pick that won, lowest consensus_pct
  contrarian_hit: (RecapPlayer & { consensus_pct: number }) | null;
  // Storyline beats (week-over-week), not rank order
  rank_movers: { riser: RecapRankMover | null; faller: RecapRankMover | null };
  lead_change: RecapLeadChange | null;
  hot_streak: RecapStreak | null;
  title_race: RecapTitleRace | null;
  // Full season standings for context (was top 5; now the whole table)
  standings: (RecapPlayer & { rank: number; total_points: number })[];
  // Badge-change deltas vs prior week's facts packet
  badge_changes: { badge_label: string; new_holders: string[]; prev_holders: string[] }[];
  // Resurfaced bad takes this week — most roastable pick per player (#295)
  bad_takes: RecapBadTake[];
  // Top active rivalry pair(s) from lifetime head-to-head (#295)
  rivalries: RecapRivalry[];
};

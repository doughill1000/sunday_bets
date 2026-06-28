// League honors (#279, epic #277 Wave 1): the reigning champion, the trophy case of
// every completed season's champion, and the current wooden spoon — all derived from the
// league_completed_standings read-model (rank 1 / max rank of completed seasons).

/** One player's standing in a completed season, shaped from league_completed_standings. */
export type SeasonHonor = {
  season_year: number;
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  rank: number;
  total_points: number;
};

export type LeagueHonors = {
  /** Rank 1 of the most-recently-completed season; null until a season completes. */
  reigningChampion: SeasonHonor | null;
  /** Rank 1 of every completed season, newest first. */
  trophyCase: SeasonHonor[];
  /** Max rank (last place) of the most-recently-completed season; null until one completes. */
  woodenSpoon: SeasonHonor | null;
};

// Identity badges (#281, epic #277 Wave 1): per-season superlative titles and threshold
// milestones derived from settled stats. Flavor slots are hardcoded here; the AI layer
// (#189) overrides them later via ai_recaps.

export type BadgeId =
  | 'the-degenerate'
  | 'mr-calculated'
  | 'the-choker'
  | 'the-ghost'
  | 'the-nemesis'
  | 'the-homer'
  | 'big-game-hunter'
  | 'perfect-week'
  // Tier-B consensus badges (#294, Wave 2 of epic #277)
  | 'contrarian'
  | 'sheep'
  | 'oracle';

/** 'title' = superlative (one holder); 'milestone' = threshold (zero or more holders). */
export type BadgeKind = 'title' | 'milestone';

export type BadgeHolder = {
  user_id: string;
  display_name: string;
};

export type BadgeAward = {
  id: BadgeId;
  label: string;
  emoji: string;
  /** Hardcoded flavor; AI layer (#189) can override this slot later. */
  flavor: string;
  kind: BadgeKind;
  holders: BadgeHolder[];
};

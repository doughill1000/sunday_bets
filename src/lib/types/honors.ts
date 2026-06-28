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

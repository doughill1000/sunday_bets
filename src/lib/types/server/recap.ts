export type SpiceLevel = 'mild' | 'medium' | 'spicy';

export type RecapPlayer = {
  user_id: string;
  display_name: string;
};

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
  // Season standings (top 5 for context)
  standings: (RecapPlayer & { rank: number; total_points: number })[];
  // Badge-change deltas vs prior week's facts packet
  badge_changes: { badge_label: string; new_holders: string[]; prev_holders: string[] }[];
};

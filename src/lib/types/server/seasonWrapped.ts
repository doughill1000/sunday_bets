// Season Wrapped facts (#347): the season edition of RecapFacts. A pure, deterministic
// packet assembled from existing season read-models, persisted per subject in
// public.season_wrapped and fed to one AI voice call (ADR-0008). See seasonFacts.ts.
import type { SpiceLevel, RecapPlayer } from '$lib/types/server/recap';

export type WrappedScope = 'player' | 'league';

/** A season-long archetype badge a player earned (#281 badge engine). */
export type WrappedBadge = {
  id: string;
  label: string;
  emoji: string;
  kind: 'title' | 'milestone';
};

/** Best/worst scoring week for a player (from stats_season_trend). */
export type WrappedWeekExtreme = { week_number: number; points: number };

/** The opponent a player fared worst against this season (from stats_head_to_head). */
export type WrappedNemesis = {
  /** display_name is neutralized to 'a player' if the opponent opted out. */
  opponent: RecapPlayer;
  wins: number; // subject's wins vs this opponent
  losses: number; // subject's losses
  pushes: number;
  games: number;
};

/** Win/loss/push record over a slice of the season. */
export type WrappedRecord = { wins: number; losses: number; pushes: number };

/** One player's year-in-review packet. The blurb addresses this player in 2nd person. */
export type PlayerWrappedFacts = {
  user_id: string;
  display_name: string;
  rank: number;
  total_points: number;
  decisions: number;
  record: WrappedRecord;
  best_week: WrappedWeekExtreme | null;
  worst_week: WrappedWeekExtreme | null;
  /** All-In (weight 'A') record for the season; null if the player made no all-in picks. */
  allin: WrappedRecord | null;
  contrarian_wins: number;
  contrarian_picks: number;
  nemesis: WrappedNemesis | null;
  badges: WrappedBadge[];
  /** Best (lowest) cumulative rank the player held in any scoring week; null if none. */
  best_rank: number | null;
  /** Longest consecutive-win run achieved this season (stats_pick_streaks.max_streak). */
  longest_streak: number;
  /** True when this player opted out of AI roasting (group_memberships.ai_recap_opt_out). */
  opted_out: boolean;
};

/** One honored player in the league packet (champion / wooden spoon). */
export type WrappedHonor = { display_name: string; total_points: number };

/** A season-long title badge and who earned it (display names, opt-out neutralized). */
export type WrappedTitleBadge = { label: string; emoji: string; holders: string[] };

/** A player's season-long rank journey (first scoring week → final), opt-out neutralized. */
export type WrappedRankJourney = {
  display_name: string;
  from_rank: number;
  to_rank: number;
  /** from_rank − to_rank; positive = climbed, negative = slid. */
  delta: number;
};

/** How the #1 spot behaved across the season (from the per-week rank-1 holder sequence). */
export type WrappedLeadSummary = {
  /** Number of scoring weeks where the #1 holder differed from the prior week. */
  changes: number;
  /** True when one player held #1 every scoring week (≥2 weeks). */
  wire_to_wire: boolean;
  /** Player who held #1 the most weeks (display name, opt-out neutralized) + the count. */
  most_weeks_leader: { display_name: string; weeks: number } | null;
};

/** The season's longest win streak (stats_pick_streaks.max_streak), opt-out neutralized. */
export type WrappedHeater = { display_name: string; streak: number };

/** The league's year-in-review packet. The blurb is 3rd-person and neutralizes opt-outs. */
export type LeagueWrappedFacts = {
  champion: WrappedHonor | null;
  wooden_spoon: WrappedHonor | null;
  /** Full season standings for context (display names, opt-out neutralized). */
  standings: (RecapPlayer & { rank: number; total_points: number })[];
  /** Season title badges with their holders (e.g. The Sharp, The Grinder). */
  title_badges: WrappedTitleBadge[];
  /** Number of active players in the league this season. */
  player_count: number;
  /** Biggest rise / fall in the standings over the season (null if no qualifying journey). */
  biggest_climber: WrappedRankJourney | null;
  biggest_faller: WrappedRankJourney | null;
  /** Story of the #1 spot: how often it changed hands, wire-to-wire, who held it longest. */
  lead: WrappedLeadSummary;
  /** Longest win streak anyone strung together this season. */
  longest_heater: WrappedHeater | null;
  /** Champion − runner-up points (the margin of victory); null with <2 players. */
  title_margin: number | null;
};

/** The full builder output: the league packet plus one packet per active player. */
export type SeasonWrappedFacts = {
  group_id: string;
  group_name: string;
  season_year: number;
  spice: SpiceLevel;
  opted_out_user_ids: string[];
  league: LeagueWrappedFacts;
  players: PlayerWrappedFacts[];
};

/** A single subject to voice + persist, discriminated by scope. */
export type SeasonWrappedSubject =
  | {
      scope: 'league';
      group_name: string;
      season_year: number;
      spice: SpiceLevel;
      subject_user_id: null;
      facts: LeagueWrappedFacts;
    }
  | {
      scope: 'player';
      group_name: string;
      season_year: number;
      spice: SpiceLevel;
      subject_user_id: string;
      facts: PlayerWrappedFacts;
    };

/** A persisted row from public.season_wrapped. `facts` is the per-subject packet. */
export type SeasonWrappedRow = {
  id: string;
  group_id: string;
  season_year: number;
  scope: WrappedScope;
  subject_user_id: string | null;
  prose: string;
  facts: PlayerWrappedFacts | LeagueWrappedFacts;
  is_fallback: boolean;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
};

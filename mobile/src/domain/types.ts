// Domain types shared across the mobile app. Mirrors src/lib/types/{domain,picks,games}.ts
// in the web app, adapted to the shapes the mobile client reads directly from Supabase.
import type { Database } from '../types/supabase';

export type TeamSide = Database['public']['Enums']['side_enum'];
export type WeightCode = Database['public']['Enums']['weight_enum'];
export type PickOutcome = Database['public']['Enums']['pick_outcome'];

/** Game shape rendered by the picks UI (mirrors the web PickGame + status/scores). */
export type PickGame = {
  id: string;
  kickoff: string;
  home: string;
  away: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  spreadTeamId: number | null;
  spreadValue: number | null;
  /** scheduled | in_progress | final | postponed */
  status: string;
  finalScores: { home: number; away: number } | null;
};

/** A complete, savable pick — both halves chosen. */
export type PickSelection = {
  team: TeamSide;
  weight: WeightCode;
};

/** A staged selection that may be partial (savable once both halves are set). */
export type StagedSelection = {
  team?: TeamSide;
  weight?: WeightCode;
};

/** Transient, non-persisted auto-save status for one game's card. */
export type SaveState = 'saving' | 'saved' | 'error';

/** Client-side state for one game's pick. */
export type PickEntry = {
  selected?: StagedSelection;
  lockedPick?: PickSelection;
  lockedAt?: string;
  lockedSpreadValue?: number;
  lockedSpreadTeamId?: number;
  /** Transient: live status of the debounced auto-save (never persisted). */
  saveState?: SaveState;
  /** Transient: human-readable reason shown alongside a failed save. */
  saveError?: string;
};

/** A group member's revealed pick (only visible after kickoff via picks_group_view). */
export type GroupPickEntry = {
  userId: string;
  displayName: string | null;
  avatarKey: string | null;
  gameId: string;
  pickedSide: TeamSide | null;
  weight: WeightCode | null;
  pickedTeamShort: string | null;
};

/** My settled result for one game (from pick_settlement, readable per group). */
export type Settlement = {
  gameId: string;
  outcome: PickOutcome | null;
  pointsDelta: number | null;
};

/** One row of the computed season standings (mirrors leaderboard_season_totals). */
export type StandingsRow = {
  userId: string;
  displayName: string;
  avatarKey: string | null;
  totalPoints: number;
  rawTotal: number;
  droppedWeekPoints: number | null;
  decisions: number;
  wins: number;
  losses: number;
  pushes: number;
  missed: number;
  rank: number;
};

export type Membership = {
  groupId: string;
  groupName: string;
  role: string;
};

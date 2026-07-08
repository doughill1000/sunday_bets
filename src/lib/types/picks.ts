import type { TeamSide, WeightCode } from './domain';

/** A complete, savable pick — both halves chosen. */
export type PickSelection = {
  team: TeamSide;
  weight: WeightCode;
};

/**
 * A staged selection that may be partial. A pick is only "complete"/lockable once
 * both `team` and `weight` are set, at which point the card's "Lock in" button
 * enables (see the picks store `lockPick` path).
 */
export type StagedSelection = {
  team?: TeamSide;
  weight?: WeightCode;
};

/** Transient, non-persisted status of an in-flight "Lock in" for one game's card. */
export type SaveState = 'saving' | 'saved' | 'error';

/** Client-side state for one game's pick. */
export type PickEntry = {
  selected?: StagedSelection;
  lockedPick?: PickSelection;
  lockedAt?: string;
  unlocksUsed?: number;
  lockedSpreadValue?: number;
  lockedSpreadTeamId?: number;
  /** Transient: live status of an in-flight "Lock in" (never persisted). */
  saveState?: SaveState;
  /** Transient: human-readable reason shown alongside a failed lock-in. */
  saveError?: string;
};

/** A group member's revealed pick (only visible after game kickoff via picks_group_view). */
export type GroupPickEntry = {
  userId: string;
  displayName: string | null;
  avatarKey: string | null;
  gameId: string;
  pickedSide: TeamSide | null;
  weight: WeightCode | null;
  pickedTeamShort: string | null;
};

/**
 * One active group member's who's-picked status for the active week (ADR-0019
 * counts-only carve-out). COUNTS ONLY — never which games/sides were picked.
 * Sourced from the security-definer `picks_status_board` RPC.
 */
export type PickStatusBoardEntry = {
  userId: string;
  displayName: string | null;
  avatarKey: string | null;
  /** Games this member has locked a pick on for the active week. */
  picksMade: number;
  /** Total games in the active week (the shared denominator, e.g. the 13 in 9/13). */
  gamesAvailable: number;
  /** True once the member has locked a pick on every available game. */
  isComplete: boolean;
};

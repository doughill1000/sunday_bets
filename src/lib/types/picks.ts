import type { TeamSide, WeightCode } from './domain';

/** A complete, savable pick — both halves chosen. */
export type PickSelection = {
  team: TeamSide;
  weight: WeightCode;
};

/**
 * A staged selection that may be partial. A pick is only "complete"/savable once
 * both `team` and `weight` are set (see the picks store auto-save path).
 */
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
  unlocksUsed?: number;
  lockedSpreadValue?: number;
  lockedSpreadTeamId?: number;
  /** Transient: live status of the debounced auto-save (never persisted). */
  saveState?: SaveState;
  /** Transient: human-readable reason shown alongside a failed save. */
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

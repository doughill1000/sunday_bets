import type { TeamSide, WeightCode } from './domain';

export type PickSelection = {
  team: TeamSide;
  weight: WeightCode;
};

/** Client-side state for one game's pick. */
export type PickEntry = {
  selected?: PickSelection;
  lockedPick?: PickSelection;
  lockedAt?: string;
  unlocksUsed?: number;
  lockedSpreadValue?: number;
  lockedSpreadTeamId?: number;
};

/** A group member's revealed pick (only visible after game kickoff). */
export type GroupPickEntry = {
  userId: string;
  displayName: string | null;
  gameId: string;
  pickedSide: TeamSide | null;
  weight: WeightCode | null;
  pickedTeamShort: string | null;
};

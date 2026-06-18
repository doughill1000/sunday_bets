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

import type { TeamSide, WeightCode } from './domain';

import type { Database } from '$lib/types/supabase';

export type LockPickArgs = Database['public']['Functions']['lock_pick']['Args'];
export type PickOutcome = Database['public']['Enums']['pick_outcome'];

// Minimal, DB-agnostic shape your Odds adapter needs
export type WeekWindow = {
  startTs: string; // ISO
  endTs: string; // ISO
  weekNumber: number; // negative for preseason if you do that
  id?: number; // optional, handy in callers
};

export type DbGameRow = {
  game_id: string;
  external_game_id: string | null;
  kickoff: string;
  home_code: string;
  home_name: string;
  away_code: string;
  away_name: string;
  spread_team: 'home' | 'away';
  spread_value: number | string;
  line_source: string;
};

export type WeekRow = {
  id: number;
  startTs: string;
  endTs: string;
  weekNumber: number;
};

export type TeamRow = {
  id: number;
  name: string;
};

export type OddsGame = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

export type PickState = { team: TeamSide; weight: WeightCode };
export type PickEntry = {
  selected?: PickState;
  lockedPick?: PickState;
  lockedAt?: string;
  unlocksUsed?: number;
  lockedSpreadValue?: number;
  lockedSpreadTeamId?: number;
};

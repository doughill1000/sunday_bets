import type { GameResult, WeightCode } from '../../types/domain';
import type { PickOutcome } from '$lib/types/server';

export type PlayerRow = { id: string; display_name: string };
export type WeekRow = { id: number; week_number: number };

export type PickRow = {
  game_id: string | null;
  week_id: number | null;
  user_id: string | null;
  weight: WeightCode | null;
  picked_team_short: string | null;
  picked_team_id: number | null;
  locked_spread_value: number | null;
  locked_spread_team_id: number | null;
};

export type SettlementRow = {
  user_id: string;
  game_id: string;
  points_delta: number | null;
  outcome: PickOutcome | null;
};

export type GameRow = {
  id: string;
  week_id: number;
  final_scores: unknown;
  home?: { short_name?: string | null } | null;
  away?: { short_name?: string | null } | null;
};

export type PickCell = {
  weight: WeightCode | null;
  team: string | null;
  result: GameResult | null;
  spread: string | null;
};

export type WeekTable = {
  games: Array<WeekTableGame>;
  cells: Record<string /* game_id */, Record<string /* user_id */, PickCell>>;
};

export type WeekTableGame = {
  game_id: string;
  label: string; // "PHI @ DAL"
  score: string | null; // "24–21" or null if not final
  isFinal: boolean;
};

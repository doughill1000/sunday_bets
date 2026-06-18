import type { WeightCode } from '../../types/domain';

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

export type GameRow = {
  id: string;
  week_id: number;
  final_scores: unknown;
  home?: { short_name?: string | null } | null;
  away?: { short_name?: string | null } | null;
};

export type WeekRow = { id: number; week_number: number };

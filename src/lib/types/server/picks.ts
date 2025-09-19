import type { TeamSide, WeightCode } from '../domain';

// Return shape mirrors the SQL RETURNS TABLE from the RPC
export type LockPickResult = {
  ok: boolean;
  user_id: string;
  game_id: string;
  picked_side: TeamSide;
  weight: WeightCode;
  locked_at: string;
} | null;

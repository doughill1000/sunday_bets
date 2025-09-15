// src/lib/api/picks.ts
import { post, del } from '$lib/api';
import type { TeamSide, WeightCode } from '$lib/types/domain';

// Define clear response types for better type safety
type LockPickResponse = {
  ok: boolean;
  reason?: string;
  final_locked_at?: string;
};

type UnlockPickResponse = {
  ok: boolean;
  reason?: string;
  unlocked_at?: string;
};

/**
 * Locks a user's pick for a specific game.
 */
export function lockPick(gameId: string, team: TeamSide, weight: WeightCode) {
  return post<LockPickResponse>(`/api/picks/${gameId}`, { team, weight });
}

/**
 * Unlocks a user's pick for a specific game.
 */
export function unlockPick(gameId: string) {
  return del<UnlockPickResponse>(`/api/picks/${gameId}`);
}

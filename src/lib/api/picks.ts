// src/lib/api/picks.ts
import { post, del } from '$lib/api';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export type LockPickResponse = {
  ok: boolean;
  reason?: string;
  final_locked_at?: string | null;
};

export type UnlockPickResponse = {
  ok: boolean;
  reason?: string;
  unlocked_at?: string | null;
};

export function lockPick(gameId: string, team: TeamSide, weight: WeightCode) {
  return post<LockPickResponse>(`/api/picks/${gameId}`, { team, weight });
}

export function unlockPick(gameId: string) {
  return del<UnlockPickResponse>(`/api/picks/${gameId}`);
}

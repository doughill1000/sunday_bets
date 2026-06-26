// src/lib/api/picks.ts
import { post, del } from '$lib/api';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export type SkippedGroup = { groupId: string; reason: string };

export type LockPickResponse = {
  ok: boolean;
  reason?: string;
  locked_at?: string | null;
  applied?: number;
  skipped?: SkippedGroup[];
};

export type UnlockPickResponse = {
  ok: boolean;
  reason?: string;
  applied?: number;
  skipped?: SkippedGroup[];
};

export function lockPick(gameId: string, team: TeamSide, weight: WeightCode) {
  return post<LockPickResponse>(`/api/picks/${gameId}`, { team, weight });
}

export function unlockPick(gameId: string) {
  return del<UnlockPickResponse>(`/api/picks/${gameId}`);
}

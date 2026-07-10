// src/lib/api/picks.ts
import { post, del } from '$lib/api';
import type { ApiError } from '$lib/types/server/api';
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

// `apiCall` (via post/del) throws on ANY non-2xx — including the 409s the picks
// route returns for expected failures (line moved, game started, All-In used) and
// the generic 500. The picks store's recovery path expects a resolved
// `{ ok: false, reason }`, not a throw, so an un-caught rejection here leaves the
// "Lock in" button stuck on "Locking in…" forever. Normalise the throw back into
// the store's contract so the reason surfaces and the button re-enables.
// See docs/audits/2026-07-09-error-handling-audit.md (P0).
export async function lockPick(
  gameId: string,
  team: TeamSide,
  weight: WeightCode
): Promise<LockPickResponse> {
  try {
    return await post<LockPickResponse>(`/api/picks/${gameId}`, { team, weight });
  } catch (err) {
    return { ok: false, reason: (err as ApiError)?.message ?? 'Could not save pick.' };
  }
}

export async function unlockPick(gameId: string): Promise<UnlockPickResponse> {
  try {
    return await del<UnlockPickResponse>(`/api/picks/${gameId}`);
  } catch (err) {
    return { ok: false, reason: (err as ApiError)?.message ?? 'Could not unlock pick.' };
  }
}

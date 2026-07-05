// Pick write-path: the same lock/unlock RPCs the web app's /api/picks endpoint calls,
// invoked directly (both are granted to `authenticated`; SQL enforces kickoff locks,
// line snapshots and the one-All-In-per-week rule). Error normalization mirrors
// src/routes/(app)/api/picks/[gameId]/+server.ts.
import type { TeamSide, WeightCode } from '@/domain/types';
import { supabase } from './supabase';

export type SkippedGroup = { groupId: string; reason: string };

export type SaveResult =
  | { ok: true; applied: number; skipped: SkippedGroup[]; lockedAt: string | null }
  | { ok: false; reason: string };

export type UnlockResult =
  { ok: true; applied: number; skipped: SkippedGroup[] } | { ok: false; reason: string };

function normalizeFanOutError(msg: string): string {
  if (/no active line/i.test(msg)) return 'Line unavailable for this game. Try again shortly.';
  if (/edits are not allowed after kickoff/i.test(msg)) return 'Game already started.';
  if (/all in already used/i.test(msg)) return 'All-In already used this week.';
  return msg;
}

/** Save (or replace) a pick — fans out to every group the user is an active member of. */
export async function savePick(
  gameId: string,
  team: TeamSide,
  weight: WeightCode,
  activeGroupId: string | null
): Promise<SaveResult> {
  const { data, error } = await supabase.rpc('lock_pick_all_groups', {
    p_game_id: gameId,
    p_side: team,
    p_weight: weight
  });

  if (error) {
    return { ok: false, reason: normalizeFanOutError(error.message ?? 'Could not save pick') };
  }

  const rows = data ?? [];
  const succeeded = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);

  if (succeeded.length === 0) {
    return {
      ok: false,
      reason: normalizeFanOutError(failed[0]?.reason ?? 'Could not save pick')
    };
  }

  const activeRow = succeeded.find((r) => r.group_id === activeGroupId) ?? succeeded[0];
  return {
    ok: true,
    applied: succeeded.length,
    skipped: failed.map((r) => ({
      groupId: r.group_id,
      reason: normalizeFanOutError(r.reason ?? '')
    })),
    lockedAt: activeRow?.locked_at ?? null
  };
}

/** Remove a saved pick across all groups (only allowed before kickoff). */
export async function unlockPick(gameId: string): Promise<UnlockResult> {
  const { data, error } = await supabase.rpc('unlock_pick_all_groups', { p_game_id: gameId });

  if (error) {
    const msg = error.message ?? '';
    if (/game started/i.test(msg) || /after kickoff/i.test(msg)) {
      return { ok: false, reason: 'Cannot unlock after kickoff.' };
    }
    return { ok: false, reason: msg || 'Could not unlock pick' };
  }

  const rows = data ?? [];
  const succeeded = rows.filter((r) => r.ok);
  const failed = rows.filter((r) => !r.ok);

  if (succeeded.length === 0 && failed.length > 0) {
    return { ok: false, reason: failed[0]?.reason ?? 'Could not unlock pick' };
  }

  return {
    ok: true,
    applied: succeeded.length,
    skipped: failed.map((r) => ({ groupId: r.group_id, reason: r.reason ?? '' }))
  };
}

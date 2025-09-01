// src/lib/stores/picks.ts
import { writable } from 'svelte/store';
import type { PickEntry } from '$lib/types/server';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import { lockPick as lockPickPost } from '$lib/api/picks';

export const picks = writable<Record<string, PickEntry>>({});

export function setPicks(data: Record<string, PickEntry>) {
  picks.set(data);
}

export function selectTeam(gameId: string, team: TeamSide) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const w = e.selected?.weight ?? e.lockedPick?.weight ?? 'L';
    return { ...s, [gameId]: { ...e, selected: { team, weight: w } } };
  });
}

export function setWeight(gameId: string, weight: WeightCode) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const t = e.selected?.team ?? e.lockedPick?.team ?? 'home';
    return { ...s, [gameId]: { ...e, selected: { team: t, weight } } };
  });
}

export async function lockPick(gameId: string): Promise<{ ok: boolean; reason?: string }> {
  let snapshot: Record<string, PickEntry>;
  let next: Record<string, PickEntry>;
  picks.update((s) => {
    snapshot = s;
    const e = s[gameId] ?? {};
    const now = new Date().toISOString();
    next = { ...s, [gameId]: { ...e, lockedPick: e.selected, lockedAt: now } };
    return next;
  });

  const result = await lockPickPost(gameId);
  if (!result.ok) {
    // rollback
    picks.set(snapshot!);
  } else {
    // if server returns authoritative flags (relock_used, final_locked_at), merge them
    picks.update((s) => {
      const e = s[gameId]!;
      return {
        ...s,
        [gameId]: {
          ...e,
          lockedAt: result.final_locked_at ?? e.lockedAt,
          unlocksUsed: result.relock_used ? 1 : e.unlocksUsed ?? 0
        }
      };
    });
  }
  return result;
}

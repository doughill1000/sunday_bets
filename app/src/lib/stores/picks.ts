// src/lib/stores/picks.ts
import { writable, get } from 'svelte/store';
import type { PickEntry } from '$lib/types/server';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import { lockPick as lockPickPost } from '$lib/api/picks';

export const picks = writable<Record<string, PickEntry>>({});

export function setPicks(data: Record<string, PickEntry>) {
  picks.set(data);
}

export function selectTeam(gameId: string, team: TeamSide) {
  console.log('selectTeam', gameId, team);
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
  // snapshot current state
  const before = get(picks);
  const entry = before[gameId];

  const team = (entry?.selected?.team ?? entry?.lockedPick?.team) as TeamSide | undefined;
  const weight = (entry?.selected?.weight ?? entry?.lockedPick?.weight) as WeightCode | undefined;

  if (!team || !weight) {
    return { ok: false, reason: 'missing team/weight' };
  }

  // optimistic update
  const nowIso = new Date().toISOString();
  picks.update((s) => ({
    ...s,
    [gameId]: {
      ...(s[gameId] ?? {}),
      lockedPick: { team, weight },
      lockedAt: nowIso
    }
  }));

  // call API with required params
  const result = await lockPickPost(gameId, team, weight);

  if (!result.ok) {
    // rollback on failure
    picks.set(before);
    return result;
  }

  // merge authoritative fields from server (if present)
  picks.update((s) => {
    const e = s[gameId]!;
    return {
      ...s,
      [gameId]: {
        ...e,
        lockedPick: { team, weight },
        lockedAt: result.final_locked_at ?? e.lockedAt ?? nowIso,
      }
    };
  });

  return result;
}

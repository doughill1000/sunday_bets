// src/lib/stores/picks.ts
import { getContext, hasContext, setContext } from 'svelte';
import { writable, get, type Writable } from 'svelte/store';
import type { PickEntry } from '$lib/types/picks';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import { lockPick as lockPickPost } from '$lib/api/picks';

export const picks = writable<Record<string, PickEntry>>({});

const PICKS_STORE = Symbol('picks-store');

export type PicksStore = Writable<Record<string, PickEntry>>;

export function providePicksStore(initialPicks: Record<string, PickEntry>): PicksStore {
  const store = writable(initialPicks);
  setContext(PICKS_STORE, store);
  if (typeof window !== 'undefined') picks.set(initialPicks);
  return store;
}

export function usePicksStore(): PicksStore {
  return hasContext(PICKS_STORE) ? getContext<PicksStore>(PICKS_STORE) : picks;
}

export function setPicks(data: Record<string, PickEntry>) {
  picks.set(data);
}

export function selectTeam(gameId: string, team: TeamSide, store: PicksStore = picks) {
  store.update((s) => {
    const e = s[gameId] ?? {};
    const w = e.selected?.weight ?? e.lockedPick?.weight ?? 'L';
    return { ...s, [gameId]: { ...e, selected: { team, weight: w } } };
  });
}

export function setWeight(gameId: string, weight: WeightCode, store: PicksStore = picks) {
  store.update((s) => {
    const e = s[gameId] ?? {};
    const t = e.selected?.team ?? e.lockedPick?.team ?? 'home';
    return { ...s, [gameId]: { ...e, selected: { team: t, weight } } };
  });
}

export async function lockPick(gameId: string): Promise<{ ok: boolean; reason?: string }> {
  const before = get(picks);
  const entry = before[gameId];

  const team = (entry?.selected?.team ?? entry?.lockedPick?.team) as TeamSide | undefined;
  const weight = (entry?.selected?.weight ?? entry?.lockedPick?.weight) as WeightCode | undefined;

  if (!team || !weight) {
    return { ok: false, reason: 'missing team/weight' };
  }

  // optimistic UI
  const optimisticAt = new Date().toISOString();
  picks.update((s) => ({
    ...s,
    [gameId]: {
      ...(s[gameId] ?? {}),
      lockedPick: { team, weight },
      lockedAt: optimisticAt
    }
  }));

  const result = await lockPickPost(gameId, team, weight);

  if (!result.ok) {
    // rollback
    picks.set(before);
    return { ok: false, reason: result.reason ?? 'Lock failed' };
  }

  // authoritative timestamp from server if provided
  picks.update((s) => {
    const e = s[gameId]!;
    return {
      ...s,
      [gameId]: {
        ...e,
        lockedPick: { team, weight },
        lockedAt: result.locked_at ?? e.lockedAt ?? optimisticAt
      }
    };
  });

  return { ok: true };
}

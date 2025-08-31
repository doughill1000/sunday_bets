import { writable } from 'svelte/store';
import type { PickEntry } from '$lib/types/server';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export const picks = writable<Record<string, PickEntry>>({});

export function setPicks(data: Record<string, PickEntry>) {
  picks.set(data);
}

export function selectTeam(gameId: string, team: TeamSide) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const w = e.lockedPick?.weight ?? 'L';
    s[gameId] = { ...e, selected: { team, weight: w } };
    return s;
  });
}

export function setWeight(gameId: string, weight: WeightCode) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const t = e.selected?.team ?? e.lockedPick?.team ?? 'home';
    s[gameId] = { ...e, selected: { team: t, weight } };
    return s;
  });
}

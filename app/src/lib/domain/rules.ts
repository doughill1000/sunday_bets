// src/lib/domain/rules.ts
import type { UIGame } from '$lib/types/ui';
import type { PickEntry } from '$lib/types/server';

export function kickoffPassed(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

export function canUseAce(gameId: string, all: Record<string, PickEntry>) {
  // only one 'A' per week unless last week (enforce server-side too)
  const usedElsewhere = Object.entries(all).some(
    ([id, e]) => id !== gameId && (e.selected?.weight === 'A' || e.lockedPick?.weight === 'A')
  );
  return !usedElsewhere;
}

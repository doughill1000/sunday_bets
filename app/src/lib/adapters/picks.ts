// src/lib/adapters/picks.ts
import type { PickEntry } from '$lib/types/server';
import type { TeamSide, WeightCode } from '$lib/types/domain';

export function toPickEntries(rows: Array<{
  game_id: string | null;
  picked_side: string | null;
  weight: 'L'|'M'|'H'|'A' | null;
  final_locked_at: string | null;
  relock_used: boolean | null;
}>): Record<string, PickEntry> {
  const map: Record<string, PickEntry> = {};
  for (const r of rows) {
    if (!r.game_id) continue;
    map[r.game_id] = {
      lockedPick: r.picked_side && r.weight
        ? { team: r.picked_side as TeamSide, weight: r.weight as WeightCode }
        : undefined,
      lockedAt: r.final_locked_at ?? undefined,
      unlocksUsed: r.relock_used ? 1 : 0
    };
  }
  return map;
}

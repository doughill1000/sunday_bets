// src/lib/server/db/getMyPicks.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { PickEntry } from '$lib/types/server';
import type { TeamSide, WeightCode } from '$lib/types/domain';

type Row = {
  game_id: string | null;
  picked_side: 'home' | 'away' | null;
  weight: 'L' | 'M' | 'H' | 'A' | null;
  locked_at: string | null;
  locked_spread_value: number | null;
  locked_spread_team_id: number | null;
  // extra fields available if you ever want them:
  // week_id: number; commence_time: string; game_started: boolean; picked_team_short: string | null;
};

export async function getMyPicks(
  event: RequestEvent,
  weekId: number
): Promise<Record<string, PickEntry>> {
  const supabase = event.locals.supabase;

  const { data, error } = await supabase
    .from('picks_status_view_user')
    .select('game_id, picked_side, weight, locked_at, locked_spread_value, locked_spread_team_id')
    .eq('week_id', weekId);

  if (error) throw error;

  const byGame: Record<string, PickEntry> = {};
  for (const r of (data ?? []) as Row[]) {
    if (!r.game_id) continue;

    byGame[r.game_id] = {
      lockedPick:
        r.picked_side && r.weight
          ? { team: r.picked_side as TeamSide, weight: r.weight as WeightCode }
          : undefined,
      lockedAt: r.locked_at ?? undefined,
      lockedSpreadValue: r.locked_spread_value ?? undefined,
      lockedSpreadTeamId: r.locked_spread_team_id ?? undefined
    };
  }
  return byGame;
}

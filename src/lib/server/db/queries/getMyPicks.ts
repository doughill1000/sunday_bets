// src/lib/server/db/getMyPicks.ts
import type { RequestEvent } from '@sveltejs/kit';
import type { PickEntry } from '$lib/types/picks';
import type { Tables } from '$lib/types/supabase';

type PickStatusRow = Tables<'picks_status_view_user'>;

export async function getMyPicks(
  event: RequestEvent,
  weekId: number,
  groupId: string
): Promise<Record<string, PickEntry>> {
  const supabase = event.locals.supabase;

  const { data, error } = await supabase
    .from('picks_status_view_user')
    .select('game_id, picked_side, weight, locked_at, locked_spread_value, locked_spread_team_id')
    .eq('week_id', weekId)
    .eq('group_id', groupId);

  if (error) throw error;

  const byGame: Record<string, PickEntry> = {};
  for (const r of (data ?? []) as PickStatusRow[]) {
    if (!r.game_id) continue;

    byGame[r.game_id] = {
      lockedPick: r.picked_side && r.weight ? { team: r.picked_side, weight: r.weight } : undefined,
      lockedAt: r.locked_at ?? undefined,
      lockedSpreadValue: r.locked_spread_value ?? undefined,
      lockedSpreadTeamId: r.locked_spread_team_id ?? undefined
    };
  }
  return byGame;
}

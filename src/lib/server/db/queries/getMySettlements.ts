// src/lib/server/db/queries/getMySettlements.ts
import { supabaseService } from '$lib/supabase/service';
import type { GameResult } from '$lib/types/domain';

export type MySettlement = { outcome: GameResult | null; pointsDelta: number | null };

/**
 * The current member's settled results for a set of games in one group, keyed by game id (#823).
 *
 * Service role, mirroring the Weekly tab's settlement read (`$lib/server/weeklyPicks.ts`):
 * settlement rows only exist after grading, which only runs post-kickoff, so there is nothing
 * here that could leak an unrevealed pick. The query is scoped to all three of (games, group,
 * user) — dropping the `user_id` filter would hand a member the whole group's outcomes, so keep
 * it even though the caller only ever renders their own row.
 *
 * Returns `{}` for an empty game list or an anonymous caller.
 */
export async function getMySettlements(
  gameIds: string[],
  groupId: string,
  userId: string | null
): Promise<Record<string, MySettlement>> {
  if (gameIds.length === 0 || !userId) return {};

  const { data, error } = await supabaseService
    .from('pick_settlement')
    .select('game_id, outcome, points_delta')
    .in('game_id', gameIds)
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;

  const byGame: Record<string, MySettlement> = {};
  for (const row of data ?? []) {
    byGame[row.game_id] = { outcome: row.outcome, pointsDelta: row.points_delta };
  }
  return byGame;
}

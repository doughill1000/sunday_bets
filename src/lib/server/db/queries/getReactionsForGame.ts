import type { RequestEvent } from '@sveltejs/kit';

export type ReactionRow = {
  id: string;
  user_id: string;
  game_id: string;
  emoji: string;
  created_at: string;
};

const REACTION_COLUMNS = 'id, user_id, game_id, emoji, created_at';

export async function getReactionsForGame(
  event: RequestEvent,
  groupId: string,
  gameId: string
): Promise<ReactionRow[]> {
  const { data, error } = await event.locals.supabase
    .from('reactions')
    .select(REACTION_COLUMNS)
    .eq('group_id', groupId)
    .eq('game_id', gameId);

  if (error) throw error;

  return data ?? [];
}

/**
 * Batched variant of {@link getReactionsForGame}: load reactions for many games
 * in one query and group them by `game_id`. Used by the picks page to avoid the
 * per-game N+1. Returns a Map keyed by game id; games with no reactions are
 * absent (callers default to []).
 */
export async function getReactionsForGames(
  event: RequestEvent,
  groupId: string,
  gameIds: string[]
): Promise<Map<string, ReactionRow[]>> {
  const byGame = new Map<string, ReactionRow[]>();
  if (gameIds.length === 0) return byGame;

  const { data, error } = await event.locals.supabase
    .from('reactions')
    .select(REACTION_COLUMNS)
    .eq('group_id', groupId)
    .in('game_id', gameIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const list = byGame.get(row.game_id);
    if (list) list.push(row);
    else byGame.set(row.game_id, [row]);
  }
  return byGame;
}

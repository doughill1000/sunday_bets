import type { RequestEvent } from '@sveltejs/kit';

export type CommentRow = {
  id: string;
  user_id: string;
  game_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
};

const COMMENT_COLUMNS = 'id, user_id, game_id, body, created_at, users(display_name)';

type RawCommentRow = {
  id: string;
  user_id: string;
  game_id: string;
  body: string;
  created_at: string;
  users: { display_name: string | null } | { display_name: string | null }[] | null;
};

function mapCommentRow(r: RawCommentRow): CommentRow {
  const user = Array.isArray(r.users) ? (r.users[0] ?? null) : r.users;
  return {
    id: r.id,
    user_id: r.user_id,
    game_id: r.game_id,
    body: r.body,
    created_at: r.created_at,
    display_name: user?.display_name ?? null
  };
}

export async function getCommentsForGame(
  event: RequestEvent,
  groupId: string,
  gameId: string
): Promise<CommentRow[]> {
  const { data, error } = await event.locals.supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(mapCommentRow);
}

/**
 * Batched variant of {@link getCommentsForGame}: load comments for many games in
 * one query and group them by `game_id`. Used by the picks page to avoid the
 * per-game N+1 (previously one query per started game). Returns a Map keyed by
 * game id; games with no comments are absent (callers default to []).
 */
export async function getCommentsForGames(
  event: RequestEvent,
  groupId: string,
  gameIds: string[]
): Promise<Map<string, CommentRow[]>> {
  const byGame = new Map<string, CommentRow[]>();
  if (gameIds.length === 0) return byGame;

  const { data, error } = await event.locals.supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('group_id', groupId)
    .in('game_id', gameIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  for (const r of data ?? []) {
    const row = mapCommentRow(r);
    const list = byGame.get(row.game_id);
    if (list) list.push(row);
    else byGame.set(row.game_id, [row]);
  }
  return byGame;
}

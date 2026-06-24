import type { RequestEvent } from '@sveltejs/kit';

export type CommentRow = {
  id: string;
  user_id: string;
  game_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
};

export async function getCommentsForGame(
  event: RequestEvent,
  groupId: string,
  gameId: string
): Promise<CommentRow[]> {
  const { data, error } = await event.locals.supabase
    .from('comments')
    .select('id, user_id, game_id, body, created_at, users(display_name)')
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    game_id: r.game_id,
    body: r.body,
    created_at: r.created_at,
    display_name: (r.users as { display_name: string | null } | null)?.display_name ?? null
  }));
}

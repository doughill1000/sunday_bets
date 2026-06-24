import type { RequestEvent } from '@sveltejs/kit';

export type ReactionRow = {
  id: string;
  user_id: string;
  game_id: string;
  emoji: string;
  created_at: string;
};

export async function getReactionsForGame(
  event: RequestEvent,
  groupId: string,
  gameId: string
): Promise<ReactionRow[]> {
  const { data, error } = await event.locals.supabase
    .from('reactions')
    .select('id, user_id, game_id, emoji, created_at')
    .eq('group_id', groupId)
    .eq('game_id', gameId);

  if (error) throw error;

  return data ?? [];
}

import type { RequestEvent } from '@sveltejs/kit';

export type ReactionRow = {
  id: string;
  user_id: string;
  comment_id: string;
  emoji: string;
  created_at: string;
  display_name: string | null;
};

// Carries the reactor's display_name so the UI can reveal "Sam, Doug" on tap (#689).
const REACTION_COLUMNS = 'id, user_id, comment_id, emoji, created_at, users(display_name)';

type RawReactionRow = {
  id: string;
  user_id: string;
  comment_id: string;
  emoji: string;
  created_at: string;
  users: { display_name: string | null } | { display_name: string | null }[] | null;
};

function mapReactionRow(r: RawReactionRow): ReactionRow {
  const user = Array.isArray(r.users) ? (r.users[0] ?? null) : r.users;
  return {
    id: r.id,
    user_id: r.user_id,
    comment_id: r.comment_id,
    emoji: r.emoji,
    created_at: r.created_at,
    display_name: user?.display_name ?? null
  };
}

/**
 * Batched: load reactions for many comments in one query and group them by
 * `comment_id`. Replaces the retired per-game `getReactionsForGame` (#688/#689) —
 * reactions now hang off comments. Ordered by `created_at` so revealed reactor
 * names read in a stable order. Returns a Map keyed by comment id; comments with
 * no reactions are absent (callers default to []).
 */
export async function getReactionsForComments(
  event: RequestEvent,
  groupId: string,
  commentIds: string[]
): Promise<Map<string, ReactionRow[]>> {
  const byComment = new Map<string, ReactionRow[]>();
  if (commentIds.length === 0) return byComment;

  const { data, error } = await event.locals.supabase
    .from('reactions')
    .select(REACTION_COLUMNS)
    .eq('group_id', groupId)
    .in('comment_id', commentIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  for (const raw of data ?? []) {
    const row = mapReactionRow(raw as RawReactionRow);
    const list = byComment.get(row.comment_id);
    if (list) list.push(row);
    else byComment.set(row.comment_id, [row]);
  }
  return byComment;
}

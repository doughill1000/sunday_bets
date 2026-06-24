import type { RequestHandler } from './$types';
import { error as httpError, json } from '@sveltejs/kit';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

type PostBody = { body: string };

// POST /api/comments/:gameId — post a comment
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const payload = (await event.request.json()) as PostBody;

  if (!payload.body?.trim()) {
    return json({ ok: false, reason: 'Comment body is required.' }, { status: 400 });
  }

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (#102)
  const userId = event.locals.user?.id;
  if (!userId) return json({ ok: false, reason: 'Not authenticated.' }, { status: 401 });

  const { data, error } = await supabase
    .from('comments')
    .insert({ group_id: groupId, game_id: gameId, body: payload.body.trim(), user_id: userId })
    .select('id, body, created_at')
    .single();

  if (error) {
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised to comment here.' }, { status: 403 });
    }
    throw httpError(500, error.message);
  }

  return json({ ok: true, comment: data });
};

// DELETE /api/comments/:gameId?commentId=<id> — delete own comment
export const DELETE: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const commentId = event.url.searchParams.get('commentId');

  if (!commentId) {
    return json({ ok: false, reason: 'commentId is required.' }, { status: 400 });
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  if (error) {
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised.' }, { status: 403 });
    }
    throw httpError(500, error.message);
  }

  return json({ ok: true });
};

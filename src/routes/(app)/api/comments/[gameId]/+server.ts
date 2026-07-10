import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';

type PostBody = { body: string };

// POST /api/comments/:gameId — post a comment
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const payload = (await event.request.json()) as PostBody;

  if (!payload.body?.trim()) {
    return json({ ok: false, reason: 'Comment body is required.' }, { status: 400 });
  }

  const userId = event.locals.user?.id;
  if (!userId) return json({ ok: false, reason: 'Not authenticated.' }, { status: 401 });

  const groupId = event.locals.groupId;
  if (!groupId) return json({ ok: false, reason: 'No active group.' }, { status: 400 });

  const { data, error } = await supabase
    .from('comments')
    .insert({ group_id: groupId, game_id: gameId, body: payload.body.trim(), user_id: userId })
    .select('id, body, created_at')
    .single();

  if (error) {
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised to comment here.' }, { status: 403 });
    }
    Sentry.captureException(error);
    return json({ ok: false, reason: 'Something went wrong. Please try again.' }, { status: 500 });
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
    Sentry.captureException(error);
    return json({ ok: false, reason: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  return json({ ok: true });
};

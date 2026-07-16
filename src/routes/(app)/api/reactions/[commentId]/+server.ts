import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';

type PostBody = { emoji: string };

// POST /api/reactions/:commentId — react to a comment (idempotent via unique constraint)
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const commentId = event.params.commentId!;
  const payload = (await event.request.json()) as PostBody;

  if (!payload.emoji?.trim()) {
    return json({ ok: false, reason: 'Emoji is required.' }, { status: 400 });
  }

  const userId = event.locals.user?.id;
  if (!userId) return json({ ok: false, reason: 'Not authenticated.' }, { status: 401 });

  const groupId = event.locals.groupId;
  if (!groupId) return json({ ok: false, reason: 'No active group.' }, { status: 400 });

  const { data, error } = await supabase
    .from('reactions')
    .insert({
      group_id: groupId,
      comment_id: commentId,
      emoji: payload.emoji.trim(),
      user_id: userId
    })
    .select('id, emoji, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Already reacted — not an error from the caller's perspective
      return json({ ok: true, duplicate: true });
    }
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised to react here.' }, { status: 403 });
    }
    Sentry.captureException(error);
    return json({ ok: false, reason: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  return json({ ok: true, reaction: data });
};

// DELETE /api/reactions/:commentId?emoji=<emoji> — toggle your own reaction off
export const DELETE: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const commentId = event.params.commentId!;
  const emoji = event.url.searchParams.get('emoji');

  if (!emoji) {
    return json({ ok: false, reason: 'emoji query param is required.' }, { status: 400 });
  }

  const userId = event.locals.user?.id;
  if (!userId) return json({ ok: false, reason: 'Not authenticated.' }, { status: 401 });

  const groupId = event.locals.groupId;
  if (!groupId) return json({ ok: false, reason: 'No active group.' }, { status: 400 });

  // Scope the delete to the caller's own row. RLS already restricts it to
  // user_id = auth.uid(), but filtering explicitly keeps the toggle unambiguous.
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('group_id', groupId)
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised.' }, { status: 403 });
    }
    Sentry.captureException(error);
    return json({ ok: false, reason: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  return json({ ok: true });
};

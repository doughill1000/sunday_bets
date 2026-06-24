import type { RequestHandler } from './$types';
import { error as httpError, json } from '@sveltejs/kit';
import { DEFAULT_GROUP_ID } from '$lib/constants/groups';

type PostBody = { emoji: string };

// POST /api/reactions/:gameId — add a reaction (idempotent via unique constraint)
export const POST: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const payload = (await event.request.json()) as PostBody;

  if (!payload.emoji?.trim()) {
    return json({ ok: false, reason: 'Emoji is required.' }, { status: 400 });
  }

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (#102)
  const userId = event.locals.user?.id;
  if (!userId) return json({ ok: false, reason: 'Not authenticated.' }, { status: 401 });

  const { data, error } = await supabase
    .from('reactions')
    .insert({ group_id: groupId, game_id: gameId, emoji: payload.emoji.trim(), user_id: userId })
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
    throw httpError(500, error.message);
  }

  return json({ ok: true, reaction: data });
};

// DELETE /api/reactions/:gameId?emoji=<emoji> — toggle reaction off
export const DELETE: RequestHandler = async (event) => {
  const { supabase } = event.locals;
  const gameId = event.params.gameId!;
  const emoji = event.url.searchParams.get('emoji');

  if (!emoji) {
    return json({ ok: false, reason: 'emoji query param is required.' }, { status: 400 });
  }

  const groupId = DEFAULT_GROUP_ID; // TODO(v2): resolve from event.locals.active_group_id (#102)

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .eq('emoji', emoji);

  if (error) {
    if (error.code === '42501') {
      return json({ ok: false, reason: 'Not authorised.' }, { status: 403 });
    }
    throw httpError(500, error.message);
  }

  return json({ ok: true });
};

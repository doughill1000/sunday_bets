import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { team, weight } = await request.json();
  const { error } = await locals.supabase.rpc('lock_pick', {
    p_game_id: params.gameId ?? '',
    p_side: team,
    p_weight: weight
  });
  if (error) return new Response(error.message, { status: 422 });
  return Response.json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { error, data } = await locals.supabase.rpc('unlock_pick', {
    p_game_id: params.gameId ?? ''
  });
  if (error) return new Response(error.message, { status: 422 });
  return Response.json({ ok: true, unlocked_at: data?.unlocked_at });
};

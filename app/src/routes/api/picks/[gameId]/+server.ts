import type { RequestHandler } from './$types';


export const POST = async ({ locals, params, request }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { team, weight } = await request.json();
  const { error } = await locals.supabase
    .rpc('lock_pick', { p_game_id: params.gameId, p_side: team, p_weight: weight });

  if (error) return new Response(error.message, { status: 422 });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
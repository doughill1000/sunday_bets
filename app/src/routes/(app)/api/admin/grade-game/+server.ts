import type { RequestHandler } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { requireAdmin } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';

export const POST: RequestHandler = async (event: RequestEvent) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  const body = await event.request.json();
  const { game_id } = body;

  // Call the SQL function (SECURITY DEFINER) — returns void
  const { error } = await supabaseService.rpc('grade_game', { p_game_id: game_id });
  if (error) {
    return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  }

  // Optional: small summary (how many settlements exist for this game now?)
  const { data: summary, error: sErr } = await supabaseService
    .from('pick_settlement')
    .select('outcome', { count: 'exact', head: true })
    .eq('game_id', game_id);

  return new Response(JSON.stringify({
    ok: true,
    game_id,
    count: summary === null ? null : (summary as unknown as { count: number })?.count ?? null
  }), { status: 200 });
};

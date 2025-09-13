import type { RequestHandler } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { requireAdmin } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  let body = await event.request.json();

  const { season_id } = body;

  const { error } = await supabaseService.rpc('grade_season', { p_season_id: season_id });
  if (error) {
    return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, season_id }), { status: 200 });
};

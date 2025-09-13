import type { RequestHandler, RequestEvent } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { requireAdmin } from '$lib/server/auth';

export const POST: RequestHandler = async (event: RequestEvent) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  const body = await event.request.json();

  const { week_id } = body;

  const { error } = await supabaseService.rpc('grade_week', { p_week_id: week_id });
  if (error) {
    return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  }

  // Optional: quick counts
  const { data: countRes, error: cntErr } = await supabaseService
    .from('pick_settlement')
    .select('*', { count: 'exact', head: true })
    .in('game_id',
      supabaseService
        .from('games')
        .select('id')
        .eq('week_id', week_id) as unknown as string[] // note: for a pure server call, do a separate query
    );

  return new Response(JSON.stringify({ ok: true, week_id }), { status: 200 });
};

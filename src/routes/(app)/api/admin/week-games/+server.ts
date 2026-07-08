import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { supabaseService } from '$lib/supabase/service';

// Games in a week, labelled "AWAY @ HOME", for the admin Grading card's single-game
// picker. Loaded on demand (game grading is a rare fix-up) so the admin never has to
// paste a game UUID. Admin-gated like the rest of /api/admin/*.
export const GET: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  const weekId = Number(event.url.searchParams.get('week_id'));
  if (!Number.isInteger(weekId) || weekId <= 0) {
    return json({ ok: false, reason: 'Invalid week_id' }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from('games')
    .select(
      `id, commence_time, final_scores,
       home_team:teams!games_home_team_id_fkey(short_name),
       away_team:teams!games_away_team_id_fkey(short_name)`
    )
    .eq('week_id', weekId)
    .order('commence_time', { ascending: true });

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  const games = (data ?? []).map((g) => ({
    id: g.id,
    label: `${g.away_team?.short_name ?? '??'} @ ${g.home_team?.short_name ?? '??'}`,
    hasFinal: g.final_scores != null && (g.final_scores as { home?: unknown }).home != null
  }));

  return json({ ok: true, games });
};

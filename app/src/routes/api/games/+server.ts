// src/routes/api/games/+server.ts
import { json, type RequestHandler} from '@sveltejs/kit';
import { createSupabaseService } from '$lib/supabase/service';

export const GET: RequestHandler = async () => {
  const supabase = createSupabaseService();
  const { data, error } = await supabase.rpc('get_active_week_games');

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  return json({ games: data ?? [] }, { status: 200 });
};


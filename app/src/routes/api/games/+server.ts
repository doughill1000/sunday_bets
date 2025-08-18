// src/routes/api/games/+server.ts
import type { RequestHandler } from './$types';
import { supabaseSSR } from '$lib/supabase/ssr';
import type { Cookies } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }: {cookies: Cookies}) => {
  const supabase = supabaseSSR(cookies);
  const { data, error } = await supabase.rpc('get_active_week_games');
  if (error) return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

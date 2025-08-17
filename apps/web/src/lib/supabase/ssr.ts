// src/lib/supabase/ssr.ts
import type { Cookies } from '@sveltejs/kit';
import { createClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function supabaseSSR(cookies: Cookies) {
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { cookies });
}

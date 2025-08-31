// src/lib/server/auth.ts
import { createSSRClient } from '$lib/supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export async function requireAdmin(event: RequestEvent) {
  const supabase = createSSRClient(event);

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false as const, user: null };

  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();

  return { isAdmin: data?.role === 'admin', user };
}

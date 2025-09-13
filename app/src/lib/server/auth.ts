// src/lib/server/auth.ts
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';

export async function requireAdmin(event: RequestEvent) {
  const userId = event.locals.user?.id as string | undefined;
  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'Not authenticated' }),
      { status: 401 }
    );
  }

  // Check role from your mirrored `users` table
  const { data, error } = await supabaseService
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  }

  if (!data || data.role !== 'admin') {
    return new Response(
      JSON.stringify({ ok: false, reason: 'Admin only' }),
      { status: 403 }
    );
  }

  // if admin, return null so caller can continue
  return null;
}

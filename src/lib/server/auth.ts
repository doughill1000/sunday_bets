// src/lib/server/auth.ts
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';

// Admin authorization for the ~8 low-frequency /api/admin/* endpoints.
//
// `event.locals.isAdmin` is resolved once per request in hooks.server.ts, but
// that value rides the short-TTL auth-context cache (ADR-0014) and is only a UI
// hint. The admin handlers use the RLS-bypassing service-role client, so
// `isAdmin` is the ONLY gate with no RLS backstop — it must never go stale here.
//
// So this guard re-reads `users.role` FRESH/UNCACHED on every call. The cost is
// one cheap query on rarely-hit endpoints, and in exchange deny-after-revocation
// is immediate: a demoted admin is rejected at this re-check, not at TTL expiry.
// Fail closed — any read error denies (403), same as a non-admin.
export async function requireAdmin(event: RequestEvent) {
  if (!event.locals.user) {
    return new Response(JSON.stringify({ ok: false, reason: 'Not authenticated' }), {
      status: 401
    });
  }

  const { data, error } = await supabaseService
    .from('users')
    .select('role')
    .eq('id', event.locals.user.id)
    .maybeSingle();

  if (error || data?.role !== 'admin') {
    return new Response(JSON.stringify({ ok: false, reason: 'Admin only' }), { status: 403 });
  }

  // if admin, return null so caller can continue
  return null;
}

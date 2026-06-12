// src/lib/server/auth.ts
import type { RequestEvent } from '@sveltejs/kit';

// Admin-ness is resolved once per request in hooks.server.ts from the
// `users.role` column; this guard just enforces it with consistent responses.
export async function requireAdmin(event: RequestEvent) {
  if (!event.locals.user) {
    return new Response(JSON.stringify({ ok: false, reason: 'Not authenticated' }), {
      status: 401
    });
  }

  if (!event.locals.isAdmin) {
    return new Response(JSON.stringify({ ok: false, reason: 'Admin only' }), { status: 403 });
  }

  // if admin, return null so caller can continue
  return null;
}

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import { invalidateAuthContext } from '$lib/server/auth-context-cache';

export const POST: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const { error } = await supabaseService
    .from('users')
    .update({ guide_seen_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  // `guide_seen_at` rides the cached `users` profile (ADR-0014). Bust it so the
  // guide does not re-open from a stale-null cache on the next navigation/reload.
  invalidateAuthContext(user.id);

  return json({ ok: true });
};

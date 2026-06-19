import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import { parseNotificationPrefs } from '$lib/domain/notifications';

// PUT /api/push/prefs — save the caller's notification preferences.
// Written via the service role (users table isn't player-writable), scoped to
// the authenticated user's own row.
export const PUT: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const raw = await event.request.json().catch(() => ({}));
  const prefs = parseNotificationPrefs(raw);

  const { error } = await supabaseService
    .from('users')
    .update({ notification_prefs: prefs })
    .eq('id', user.id);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });
  return json({ ok: true, prefs });
};

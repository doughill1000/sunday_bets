import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import { prefsAfterSubscribe } from '$lib/domain/notifications';

// Browser PushSubscription JSON shape (the fields we persist).
type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

/**
 * Turn the caller's account-level master switch on (#858).
 *
 * A subscription row alone delivers nothing: every send path gates on
 * `notification_prefs.enabled`, which defaults to false. Callers that subscribe without
 * going through /settings — the engagement banner's "Enable" — used to land a live
 * endpoint behind a switch that was still off, and the banner then hid itself, so the
 * member was silently and permanently opted out. Subscribing is an explicit opt-in, so
 * it flips the switch here.
 *
 * Written via the service role (the users table isn't player-writable) and scoped to
 * the caller's own row — the same approach as PUT /api/push/prefs.
 */
async function enableMasterSwitch(userId: string): Promise<string | null> {
  const { data, error: readError } = await supabaseService
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single();

  if (readError) return readError.message;

  const prefs = prefsAfterSubscribe(data?.notification_prefs);
  if (!prefs) return null; // already on — nothing to write

  const { error } = await supabaseService
    .from('users')
    .update({ notification_prefs: prefs })
    .eq('id', userId);

  return error ? error.message : null;
}

// POST /api/push/subscribe — register/refresh the caller's push subscription.
export const POST: RequestHandler = async (event) => {
  const { user, supabase } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const body = (await event.request.json().catch(() => ({}))) as SubBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return json({ ok: false, reason: 'Invalid subscription' }, { status: 400 });
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth_key: body.keys.auth,
      user_agent: event.request.headers.get('user-agent'),
      last_seen_at: new Date().toISOString()
    },
    { onConflict: 'endpoint' }
  );

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  // Fail loudly if the switch can't be flipped: reporting success while the account
  // stays muted is the exact failure this endpoint had. The whole call is idempotent,
  // so the caller can simply retry.
  const prefsError = await enableMasterSwitch(user.id);
  if (prefsError) return json({ ok: false, reason: prefsError }, { status: 500 });

  return json({ ok: true });
};

// DELETE /api/push/subscribe — remove the caller's subscription by endpoint.
export const DELETE: RequestHandler = async (event) => {
  const { user, supabase } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const body = (await event.request.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return json({ ok: false, reason: 'Missing endpoint' }, { status: 400 });

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });
  return json({ ok: true });
};

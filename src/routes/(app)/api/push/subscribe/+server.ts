import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

// Browser PushSubscription JSON shape (the fields we persist).
type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

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

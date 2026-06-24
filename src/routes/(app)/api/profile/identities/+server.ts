import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const raw = await event.request.json().catch(() => ({}));
  const identityId: string | null =
    raw != null && typeof raw === 'object' && typeof raw.identity_id === 'string'
      ? raw.identity_id
      : null;

  if (!identityId) return json({ ok: false, reason: 'Missing identity_id' }, { status: 400 });

  const { data: idData, error: fetchErr } = await event.locals.supabase.auth.getUserIdentities();
  if (fetchErr) return json({ ok: false, reason: fetchErr.message }, { status: 500 });

  const identities = idData?.identities ?? [];

  if (identities.length <= 1) {
    return json({ ok: false, reason: 'Cannot remove your only sign-in method.' }, { status: 422 });
  }

  const target = identities.find((i) => i.identity_id === identityId);
  if (!target) return json({ ok: false, reason: 'Identity not found' }, { status: 404 });

  const { error } = await event.locals.supabase.auth.unlinkIdentity(target);
  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  return json({ ok: true });
};

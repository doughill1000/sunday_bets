import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import { AVATAR_PRESETS } from '$lib/avatars';

const VALID_KEYS = new Set(AVATAR_PRESETS.map((p) => p.key));

export const PUT: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const raw = await event.request.json().catch(() => ({}));
  const avatarKey: string | null =
    raw != null && typeof raw === 'object' && 'avatar_key' in raw
      ? (raw.avatar_key as string | null)
      : null;

  if (avatarKey !== null && !VALID_KEYS.has(avatarKey)) {
    return json({ ok: false, reason: 'Invalid avatar_key' }, { status: 400 });
  }

  const { error } = await supabaseService
    .from('users')
    .update({ avatar_key: avatarKey })
    .eq('id', user.id);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });
  return json({ ok: true, avatar_key: avatarKey });
};

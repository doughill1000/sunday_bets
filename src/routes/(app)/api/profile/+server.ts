import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';
import { invalidateAuthContext } from '$lib/server/auth-context-cache';
import { AVATAR_PRESETS } from '$lib/avatars';
import { validateDisplayName } from '$lib/server/profile-validation';
import { isThemeMode } from '$lib/theme';

const VALID_KEYS = new Set(AVATAR_PRESETS.map((p) => p.key));

export const PUT: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const raw = await event.request.json().catch(() => ({}));
  if (raw == null || typeof raw !== 'object') {
    return json({ ok: false, reason: 'Invalid request body' }, { status: 400 });
  }

  const update: {
    avatar_key?: string | null;
    display_name?: string;
    show_team_trends?: boolean;
    theme_pref?: string;
  } = {};

  if ('avatar_key' in raw) {
    const avatarKey = (raw as Record<string, unknown>).avatar_key as string | null;
    if (avatarKey !== null && !VALID_KEYS.has(avatarKey)) {
      return json({ ok: false, reason: 'Invalid avatar_key' }, { status: 400 });
    }
    update.avatar_key = avatarKey;
  }

  if ('display_name' in raw) {
    const result = validateDisplayName((raw as Record<string, unknown>).display_name);
    if (!result.ok) return json({ ok: false, reason: result.reason }, { status: 400 });
    update.display_name = result.value;
  }

  if ('show_team_trends' in raw) {
    const value = (raw as Record<string, unknown>).show_team_trends;
    if (typeof value !== 'boolean') {
      return json({ ok: false, reason: 'Invalid show_team_trends' }, { status: 400 });
    }
    update.show_team_trends = value;
  }

  if ('theme_pref' in raw) {
    const value = (raw as Record<string, unknown>).theme_pref;
    if (!isThemeMode(value)) {
      return json({ ok: false, reason: 'Invalid theme_pref' }, { status: 400 });
    }
    update.theme_pref = value;
  }

  if (Object.keys(update).length === 0) {
    return json({ ok: false, reason: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabaseService.from('users').update(update).eq('id', user.id);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });

  // Bust the auth context cache (ADR-0014) so changes show immediately in the app shell.
  invalidateAuthContext(user.id);

  return json({ ok: true });
};

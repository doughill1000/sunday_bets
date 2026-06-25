import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { supabaseService } from '$lib/supabase/service';

export const POST: RequestHandler = async (event) => {
  const { user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });

  const { error } = await supabaseService
    .from('users')
    .update({ guide_seen_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return json({ ok: false, reason: error.message }, { status: 500 });
  return json({ ok: true });
};

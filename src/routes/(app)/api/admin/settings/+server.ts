import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth';
import { supabaseService } from '$lib/supabase/service';
import { z } from 'zod';

const patchSchema = z.object({
  final_week_unlimited_allin: z.boolean()
});

export const PATCH: RequestHandler = async (event) => {
  const guard = await requireAdmin(event);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'Invalid JSON' }), { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ ok: false, reason: 'Invalid payload' }), { status: 400 });
  }

  const { error } = await supabaseService
    .from('settings')
    .update({ final_week_unlimited_allin: parsed.data.final_week_unlimited_allin })
    .eq('id', true);

  if (error) {
    console.error('settings PATCH failed', error);
    return new Response(JSON.stringify({ ok: false, reason: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

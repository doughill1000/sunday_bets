// POST /api/group/update-recap-settings
// Commissioner sets AI recap tone (spice) and enable/disable (issue #301, ADR-0008).
// Calls update_group_recap_settings as the authenticated user; the commissioner check
// is enforced inside the SECURITY DEFINER function.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const bodySchema = z.object({
  spice: z.enum(['mild', 'medium', 'spicy']),
  ai_recaps_enabled: z.boolean()
});

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can change AI recap settings.';
  return 'Could not update AI recap settings.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ reason: 'Invalid payload' }, { status: 400 });

  const { spice, ai_recaps_enabled } = parsed.data;
  const { error } = await supabase.rpc('update_group_recap_settings', {
    p_group_id: groupId,
    p_spice: spice,
    p_ai_recaps_enabled: ai_recaps_enabled
  });

  if (error) return json({ reason: errReason(error.code) }, { status: 400 });

  return json({ ok: true });
};

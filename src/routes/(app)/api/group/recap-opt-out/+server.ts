// POST /api/group/recap-opt-out
// Any member toggles their own AI recap opt-out for their active group (issue #301, ADR-0008).
// Calls update_recap_opt_out; the membership check is enforced inside the SECURITY DEFINER function.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const bodySchema = z.object({
  ai_recap_opt_out: z.boolean()
});

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ reason: 'Invalid payload' }, { status: 400 });

  const { error } = await supabase.rpc('update_recap_opt_out', {
    p_group_id: groupId,
    p_ai_recap_opt_out: parsed.data.ai_recap_opt_out
  });

  if (error) return json({ reason: 'Could not update recap preference.' }, { status: 400 });

  return json({ ok: true });
};

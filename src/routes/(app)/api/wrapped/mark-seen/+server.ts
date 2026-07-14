// POST /api/wrapped/mark-seen
// Player marks the current group's Season Wrapped as seen for a season (issue #548,
// mirrors #302's recap_seen). Written via locals.supabase (session-scoped) — RLS
// (52_policies_wrapped_seen.sql) is the trust boundary: user_id must be the caller and
// they must still be a member of locals.groupId, which is why group_id is never taken
// from the body.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const bodySchema = z.object({
  seasonYear: z.number().int()
});

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ reason: 'Invalid payload' }, { status: 400 });

  const { error } = await supabase.from('wrapped_seen').upsert(
    {
      user_id: user.id,
      group_id: groupId,
      season_year: parsed.data.seasonYear
    },
    { onConflict: 'user_id,group_id,season_year', ignoreDuplicates: true }
  );

  if (error) return json({ reason: 'Could not mark Wrapped seen.' }, { status: 400 });
  return json({ ok: true });
};

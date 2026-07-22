// POST /api/group/set-competition-start
// Commissioner moves when competition begins for the league (ADR-0037 ruling 4). Calls the
// set_competition_start RPC as the authenticated user; the commissioner check, the
// freeze-once-play-begins guard, and the no-backdate guard are all enforced inside the
// SECURITY DEFINER function.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const bodySchema = z.object({
  // The chosen future week's start_ts, or null for "start this week, from now" — the RPC
  // resolves null to the DB's own now() (race-free), never a client-computed timestamp.
  competition_start: z.string().datetime({ offset: true }).nullable()
});

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can change when play starts.';
  if (code === 'P0031') return "Play has already begun — the start week can't change now.";
  if (code === 'P0032') return "The start week can't be in the past.";
  return 'Could not update when play starts.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ reason: 'Invalid payload' }, { status: 400 });

  const { error } = await supabase.rpc('set_competition_start', {
    p_group_id: groupId,
    // Omit for the "start this week, from now" case: the arg defaults to null in SQL, which
    // the RPC resolves to the DB's own now() (race-free). A chosen future week is sent as-is.
    p_starts_at: parsed.data.competition_start ?? undefined
  });

  if (error) return json({ reason: errReason(error.code) }, { status: 400 });

  return json({ ok: true });
};

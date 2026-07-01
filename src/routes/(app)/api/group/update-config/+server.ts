// POST /api/group/update-config
// Commissioner edits per-group league rules (issue #154). Calls the
// update_group_config RPC as the authenticated user; the commissioner check and
// the ADR-0007 season-freeze are enforced inside the SECURITY DEFINER function.
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { refreshLeaderboardStats } from '$lib/server/grading';

const bodySchema = z.object({
  grading_preset: z.enum(['house', 'gamer']),
  drop_worst_week: z.boolean(),
  // Season the drop applies from (ADR-0018). Nullable so the field can be cleared;
  // the RPC treats null as "leave unchanged", so the UI sends the chosen year.
  drop_worst_week_start_year: z.number().int().nullable()
});

function errReason(code: string | undefined): string {
  if (code === 'P0020') return 'Only commissioners can change league rules.';
  if (code === 'P0030') return "Grading preset can't change after the season has started.";
  return 'Could not update league rules.';
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user, supabase, groupId } = locals;
  if (!user || !groupId) return json({ reason: 'Not authenticated' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ reason: 'Invalid payload' }, { status: 400 });

  const { grading_preset, drop_worst_week, drop_worst_week_start_year } = parsed.data;
  const { error } = await supabase.rpc('update_group_config', {
    p_group_id: groupId,
    p_grading_preset: grading_preset,
    p_drop_worst_week: drop_worst_week,
    // null → RPC leaves the stored start year unchanged (its "leave unchanged" convention).
    p_drop_worst_week_start_year: drop_worst_week_start_year ?? undefined
  });

  if (error) return json({ reason: errReason(error.code) }, { status: 400 });

  // drop_worst_week feeds leaderboard_season_totals (a materialized view, issue #191),
  // so a config change must refresh it for the standings to reflect the new rule. Like
  // the grading path, this is best-effort and never fails the config write.
  await refreshLeaderboardStats();

  return json({ ok: true });
};

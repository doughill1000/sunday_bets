import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { gradeWeek } from '$lib/server/grading';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  try {
    const { week_id, refreshScores = true, daysFrom = 1 } = await event.request.json();

    if (!week_id) {
      return json({ ok: false, reason: 'Missing required parameter: week_id' }, { status: 400 });
    }

    const result = await gradeWeek(week_id, { refreshScores, daysFrom });
    return json(result);
  } catch (e: any) {
    return json({ ok: false, reason: e.message }, { status: 500 });
  }
};

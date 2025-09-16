import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { gradeGame } from '$lib/server/grading';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  try {
    const { game_id, refreshScores = false, daysFrom = 1 } = await event.request.json();

    if (!game_id) {
      return json({ ok: false, reason: 'Missing required parameter: game_id' }, { status: 400 });
    }

    const result = await gradeGame(game_id, { refreshScores, daysFrom });
    return json(result);
  } catch (e: any) {
    return json({ ok: false, reason: e.message }, { status: 500 });
  }
};

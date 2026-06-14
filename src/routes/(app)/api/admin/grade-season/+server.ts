import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { gradeSeason } from '$lib/server/grading';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  try {
    const { season_id, refreshScores = false, daysFrom = 3 } = await event.request.json();

    if (!season_id) {
      return json({ ok: false, reason: 'Missing required parameter: season_id' }, { status: 400 });
    }

    const result = await gradeSeason(season_id, { refreshScores, daysFrom });
    return json(result);
  } catch (e) {
    return json(
      { ok: false, reason: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/services/auth.service';
import { gradeGame } from '$lib/server/services/grading.service';

export const POST: RequestHandler = async (event) => {
  const authErr = await requireAdmin(event);
  if (authErr) return authErr;

  const { game_id, refreshScores = false, daysFrom = 1 } = await event.request.json();

  try {
    const result = await gradeGame(game_id, { refreshScores, daysFrom });
    return json200(result);
  } catch (e: any) {
    return json500(e.message);
  }
};

function json200(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200 });
}
function json500(reason: string) {
  return new Response(JSON.stringify({ ok: false, reason }), { status: 500 });
}

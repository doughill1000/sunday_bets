import type { RequestHandler } from './$types';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { supabaseService } from '$lib/supabase/service';

type WeekStatus =
  | { ok: true; reason: 'no_concluded_week' }
  | {
      ok: boolean;
      week_id: number;
      week_number: number;
      total_games: number;
      final_games: number;
      unsettled_final_games: number;
    };

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const jobResult = await withCronLog('rollover-week', async () => {
    const { data, error } = await supabaseService.rpc('advance_week_if_complete');
    if (error) throw new Error(error.message);
    const status = data as unknown as WeekStatus;
    if (!status.ok) {
      const s = status as Exclude<WeekStatus, { reason: string }>;
      throw new Error(
        `Week ${s.week_number} incomplete: ${s.final_games}/${s.total_games} games final, ` +
          `${s.unsettled_final_games} final game(s) still unsettled`
      );
    }
    return status;
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

import { supabaseService } from '$lib/supabase/service';

export async function upsertWeek(params: {
  seasonId: number;
  weekNumber: number;
  startTs: string;
  endTs: string;
  // Whether this round counts toward standings/stats (ADR-0016). Preseason weeks pass
  // false; regular weeks default true.
  isScoring?: boolean;
}): Promise<number> {
  const { seasonId, weekNumber, startTs, endTs, isScoring = true } = params;

  const { data, error } = await supabaseService
    .from('weeks')
    .upsert(
      {
        season_id: seasonId,
        week_number: weekNumber,
        start_ts: startTs,
        end_ts: endTs,
        is_scoring: isScoring
      },
      { onConflict: 'season_id,week_number' }
    )
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error(`upsertWeek: no id returned for week ${weekNumber}`);
  return data.id;
}

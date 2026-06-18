import { supabaseService } from '$lib/supabase/service';
import type { Tables } from '$lib/types/supabase';

export type CronRunRow = Tables<'cron_run_log'>;

export async function getRecentCronRuns(): Promise<CronRunRow[]> {
  const { data, error } = await supabaseService
    .from('cron_run_log')
    .select('id,job,started_at,finished_at,ok,summary,error')
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

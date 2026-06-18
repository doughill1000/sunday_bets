import { supabaseService } from '$lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';

// TODO: remove this local type after running `pnpm db:types` once cron_run_log
// has been added to the generated Supabase types (src/lib/types/supabase.ts).
export type CronRunRow = {
  id: number;
  job: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  summary: unknown;
  error: string | null;
};

export async function getRecentCronRuns(): Promise<CronRunRow[]> {
  const client = supabaseService as unknown as SupabaseClient;
  const { data, error } = await client
    .from('cron_run_log')
    .select('id,job,started_at,finished_at,ok,summary,error')
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as CronRunRow[];
}

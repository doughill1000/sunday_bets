import { supabaseService } from '$lib/supabase/service';

/**
 * Latest successful (ok=true) run's `started_at` per job, as a Date. One small
 * lookup per job (run in parallel) rather than a single windowed fetch, so a
 * weekly/monthly job's last success is found even when a frequent job (pregame)
 * dominates the recent rows. Jobs that have never succeeded map to null.
 *
 * Used by the cron missed-run watchdog (src/routes/api/health/+server.ts, #206).
 */
export async function getLatestCronSuccesses(
  jobs: readonly string[]
): Promise<Map<string, Date | null>> {
  const entries = await Promise.all(
    jobs.map(async (job) => {
      const { data, error } = await supabaseService
        .from('cron_run_log')
        .select('started_at')
        .eq('job', job)
        .eq('ok', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const ts = data?.started_at ? new Date(data.started_at) : null;
      return [job, ts] as const;
    })
  );
  return new Map(entries);
}

import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './findActiveWeek';

/**
 * Returns the set of weeks the grade cron should process on each run.
 *
 * Collects up to two candidates:
 *   1. The currently-active week (start_ts <= now <= end_ts), if any.
 *   2. The most-recently-concluded week (greatest end_ts <= now), if any.
 *
 * Deduplicates by id so a week at its exact boundary (end_ts == now) is
 * not returned twice. Weeks are returned in no guaranteed order.
 */
export async function findRecentGradableWeeks() {
  const now = new Date().toISOString();

  const [activeWeek, priorResult] = await Promise.all([
    findActiveWeek().catch(() => null),
    supabaseService
      .from('weeks')
      .select('*')
      .lte('end_ts', now)
      .order('end_ts', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const { data: priorWeek, error: priorError } = priorResult;
  if (priorError) throw priorError;

  const candidates = [activeWeek, priorWeek ?? null];
  const seen = new Set<number>();
  const result: NonNullable<typeof activeWeek>[] = [];

  for (const week of candidates) {
    if (week !== null && !seen.has(week.id)) {
      seen.add(week.id);
      result.push(week);
    }
  }

  return result;
}

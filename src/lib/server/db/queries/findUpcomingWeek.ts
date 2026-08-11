import { supabaseService } from '$lib/supabase/service';

/**
 * The soonest week that has not started yet — the slate players see next (#801).
 *
 * Sibling of `findActiveWeek`, and deliberately ordered by `start_ts` rather than
 * `week_number`: preseason weeks count DOWN (ADR-0016 — `-1` is the Hall of Fame
 * game, `-4` the last tune-up), so "the next higher week number" walks backwards
 * through the preseason and lands on a week that has already been played. Only
 * the clock says which week is next.
 *
 * Deliberately unfiltered by season: every historical season's weeks are already
 * in the past, so `start_ts > now` selects the current/next season's on its own.
 */
export async function findUpcomingWeek() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('*')
    .gt('start_ts', now)
    .order('start_ts', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

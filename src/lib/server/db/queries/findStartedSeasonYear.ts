import { supabaseService } from '$lib/supabase/service';

/**
 * The season year of the most recently *started* week — "the season actually in play" (#824).
 *
 * Third sibling of `findActiveWeek` / `findUpcomingWeek`, and the same reason for ordering by
 * `start_ts` rather than `week_number`: preseason weeks count DOWN (ADR-0016), so only the clock
 * says which round is the current one.
 *
 * Deliberately looser than `findActiveWeek()`: "started" (`start_ts <= now`), not "live"
 * (`start_ts <= now <= end_ts`). A week window is gapless with its neighbours (`weekWindow.ts`)
 * so the two agree in-season, but "started" degrades to the last week ever played instead of to
 * `null` — which is what makes it safe as a page's season anchor. In the true off-season it
 * returns the season that just finished, matching the last-graded-season default it replaces;
 * during a season it returns that season, preseason included, months before any matview has a
 * row for it.
 *
 * Deliberately unfiltered by season and by `is_scoring`: a non-scoring round is still picked,
 * graded and displayed (ADR-0016 boundary 1), so it is exactly the round /week should open on.
 * Also unfiltered by group — `weeks` is global, and which season is underway is not a per-group
 * fact.
 *
 * Returns `null` only when no week has ever started (an empty or freshly-seeded database).
 */
export async function findStartedSeasonYear(): Promise<number | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('seasons!inner(year)')
    .lte('start_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return (data.seasons as { year: number }).year;
}

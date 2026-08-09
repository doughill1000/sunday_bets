import { supabaseService } from '$lib/supabase/service';

/**
 * A week is recap-ready only once every game in it has been settled (final scores present).
 * Mirrors the completeness notion `advance_week_if_complete` enforces, so partial-week grade
 * runs don't fire a recap early.
 *
 * Lives here — not in `notifications.ts`, where it started — because that module imports the
 * push/Sentry client chain, which cannot load under the integration-test runner. Three
 * post-grade modules (`aiRecap`, `seasonWrapped`, `badgeFlavor`) each need this predicate,
 * and two of them had already answered that by keeping a private copy. This module is the
 * one copy: dependency-light (service client only), so importing it costs a caller nothing.
 *
 * Note this asks only "is the week finished", never "does the week count" — that is
 * `isScoringWeek()`, deliberately kept separate (see its doc comment).
 */
export async function isWeekFullyGraded(weekId: number): Promise<boolean> {
  const { count, error } = await supabaseService
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('week_id', weekId)
    .is('final_scores', null);
  if (error) throw error;
  return (count ?? 0) === 0;
}

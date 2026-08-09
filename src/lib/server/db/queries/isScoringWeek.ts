import { supabaseService } from '$lib/supabase/service';

/**
 * Does this round count? `weeks.is_scoring` is ADR-0016's single source of truth: a
 * non-scoring round (preseason, or any future "practice" round) is pickable and graded,
 * but its settlements contribute zero to every standings/stats surface.
 *
 * ADR-0016 applies that gate inside each aggregating matview, which covers the numbers —
 * but the post-grade *story* surfaces (the AI recap and the two recap pushes) read those
 * matviews and then narrate on top of them, so they inherited no gate at all (#789). A
 * one-game preseason week goes fully-graded the moment its single game ends, and the
 * recap fired on a round with, by construction, nothing to say.
 *
 * Deliberately NOT folded into `isWeekFullyGraded()`: that predicate means "every game has
 * final scores", it is copied privately into `seasonWrapped.ts` and `badgeFlavor.ts` to keep
 * their import graphs free of the push/Sentry chain, and overloading it would silently change
 * three modules' gates at once. Kept dependency-light (service client only) for the same
 * reason, so any caller can reach for it.
 *
 * A missing week resolves to `false` — there is nothing to tell a story about.
 */
export async function isScoringWeek(weekId: number): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('weeks')
    .select('is_scoring')
    .eq('id', weekId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_scoring === true;
}

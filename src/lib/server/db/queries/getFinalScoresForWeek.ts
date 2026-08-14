// src/lib/server/db/queries/getFinalScoresForWeek.ts
import { supabaseService } from '$lib/supabase/service';
import type { PickGame } from '$lib/types/games';

type FinalScores = NonNullable<PickGame['finalScores']>;

/**
 * Graded final scores for a week's games, keyed by game id (#832, salvaged from #823/PR #829).
 *
 * Read straight off `games` rather than through `ui_games`, which is the *pickable slate* view
 * (kickoff, teams, active line) and deliberately carries no grading columns — widening it would
 * be a migration for one field. Grading is the only writer of `final_scores`
 * (`$lib/server/grading.ts`), so a key present here means the grade cron has settled that game.
 * That is what lets the `/picks` handoff strip split the underway games into "in play" and
 * "final" from the database alone, with no ESPN call anywhere on the page.
 *
 * Service role, matching `getGamesWithActiveLines`: this is slate-level data with no per-member
 * component, and the strip needs it for every game in the week.
 */
export async function getFinalScoresForWeek(weekId: number): Promise<Record<string, FinalScores>> {
  const { data, error } = await supabaseService
    .from('games')
    .select('id, final_scores')
    .eq('week_id', weekId)
    .not('final_scores', 'is', null);

  if (error) throw error;

  const byGame: Record<string, FinalScores> = {};
  for (const row of data ?? []) {
    // `final_scores` is jsonb, so the generated type is `Json` — narrow it here rather than
    // letting an unexpected shape reach the UI as a half-populated score.
    const scores = row.final_scores as { home?: unknown; away?: unknown } | null;
    const home = Number(scores?.home);
    const away = Number(scores?.away);
    if (!Number.isFinite(home) || !Number.isFinite(away)) continue;
    byGame[row.id] = { home, away };
  }
  return byGame;
}

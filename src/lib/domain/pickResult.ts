// How a committed pick on the picks board should read right now (#823).
//
// The picks board used to hang its whole score row off the live ESPN feed, so a game that had
// finished — and been graded hours ago — rendered a bare "⏱ Kicked off" forever: the live
// payload was gone (it ages out with the window, #822) and there was nothing to fall back to.
// This resolver names the fallback order explicitly and makes it unit-testable, so the board's
// four states are decided in one pure place instead of three `{#if}` chains.
//
// PRECEDENCE — graded › unofficial › live › none:
//
//  1. `graded`      the grade cron has settled the game. Authoritative and terminal.
//  2. `unofficial`  the live feed says `final` but grading hasn't run — labelled unofficial.
//  3. `live`        the game is in progress; the display-only cover mirror (#386).
//  4. `null`        kicked off, nothing to say yet (pre-final, no feed).
//
// The graded tier is checked FIRST and unconditionally, which is the guarantee
// `$lib/server/liveScores.ts` documents as "yields to graded" and `WeeklyPickCard`'s `isGraded`
// gate already relies on: a live payload must never supersede a settled result. That matters in
// practice because the two can legitimately coexist — the grade cron can settle a game while it
// is still inside its live window, and the board would otherwise keep showing a provisional
// verdict over a final one.
import type { GameResult } from '$lib/types/domain';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';
import type { LiveScoreEntry } from '$lib/live/types';
import { liveCoverState, type LiveCoverState } from './liveCover';

/** The game is settled. `outcome`/`pointsDelta` are what grading wrote for THIS member, and are
 *  null when it wrote nothing for them (e.g. the ADR-0037 participation boundary) — the score
 *  is still a fact worth showing, so the tier does not depend on them. */
export type GradedPickResult = {
  kind: 'graded';
  homeScore: number;
  awayScore: number;
  outcome: GameResult | null;
  pointsDelta: number | null;
};

/** The feed says the game is over but grading hasn't run. Same display-only cover mirror as
 *  `live`, but must be labelled unofficial — it is not a settlement. */
export type UnofficialPickResult = {
  kind: 'unofficial';
  score: LiveScoreEntry;
  cover: LiveCoverState;
};

/** The game is in progress. `stale` is the #386 "stop asserting a number" flag. */
export type LivePickResult = {
  kind: 'live';
  score: LiveScoreEntry;
  cover: LiveCoverState;
  stale: boolean;
};

export type PickResult = GradedPickResult | UnofficialPickResult | LivePickResult;

export type PickResultInput = {
  /** This member's entry for the game from the picks store — the locked pick, its frozen line,
   *  and (once graded) the settled outcome. */
  entry: PickEntry | undefined;
  game: PickGame;
  /** This game's entry from the live feed, or null/undefined outside the live window. */
  liveScore: LiveScoreEntry | null | undefined;
  /** The board's feed-freshness flag (#386/#822). Only ever applies to an in-progress score. */
  liveStale?: boolean;
};

/**
 * Resolve the one state a committed row should render, or `null` when there is nothing to show
 * beyond "kicked off".
 *
 * A `final` live payload is deliberately exempt from `liveStale`. Staleness exists to stop the
 * board passing a *moving* number off as current; a final score does not move, so aging it out
 * would replace a correct answer with a worse one — and it is precisely the reading someone
 * arriving in the gap between the final whistle and the grade cron needs.
 */
export function resolvePickResult({
  entry,
  game,
  liveScore,
  liveStale = false
}: PickResultInput): PickResult | null {
  // 1. Graded. `games.final_scores` is written only by grading (`$lib/server/grading.ts`), so
  //    its presence IS the settled signal — no separate "is it graded" flag to keep in sync.
  const finalScores = game.finalScores;
  if (finalScores) {
    return {
      kind: 'graded',
      homeScore: finalScores.home,
      awayScore: finalScores.away,
      outcome: entry?.outcome ?? null,
      pointsDelta: entry?.pointsDelta ?? null
    };
  }

  // 2/3. Both live tiers need a locked pick and a computable cover, exactly as the board's
  //      previous `myCover` did — a missed pick shows no live verdict, only the graded one.
  const lockedPick = entry?.lockedPick;
  if (!liveScore || !lockedPick) return null;

  const pickedTeamId = lockedPick.team === 'home' ? game.homeTeamId : game.awayTeamId;
  const cover = liveCoverState({
    homeScore: liveScore.homeScore,
    awayScore: liveScore.awayScore,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    pickedTeamId,
    // Fall back to the game's current line only when the pick carries no frozen one.
    lockedSpreadTeamId: entry?.lockedSpreadTeamId ?? game.spreadTeamId,
    lockedSpreadValue: entry?.lockedSpreadValue ?? game.spreadValue
  });
  if (!cover) return null;

  if (liveScore.status === 'final') return { kind: 'unofficial', score: liveScore, cover };
  return { kind: 'live', score: liveScore, cover, stale: liveStale };
}

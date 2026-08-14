// src/lib/domain/weekUnderway.ts
//
// The counts behind the `/picks` handoff strip (#832). Kickoff is a hard boundary on `/picks`:
// a game that has started leaves the board entirely and is represented only by this one-line
// summary, which links onward to `/week` where the real sweat lives.
//
// Everything here is derived from data the page already has from the DATABASE — the week's
// games (with `finalScores`, written only by grading) and my own picks (with the settled
// `outcome` / `pointsDelta` grading wrote). There is deliberately no live-feed input: `/picks`
// issues zero ESPN calls in any state, which is the point of the deletion this replaces.
import { hasLine } from '$lib/domain/spread';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';

export type WeekUnderwayCounts = {
  /** Every game that has kicked off — the games that left the board. */
  total: number;
  /** Kicked off, not yet graded. */
  inPlay: number;
  /** Graded: `games.final_scores` is populated. */
  final: number;
  /** Kickoffs I let pass without a pick — the moment the deleted red row used to carry. */
  missed: number;
  /** How many of my underway picks have actually settled (the `so far` denominator). */
  settledCount: number;
  /** Net settled points across those, already carrying any missed-pick penalty. */
  settledPoints: number;
};

const EMPTY: WeekUnderwayCounts = {
  total: 0,
  inPlay: 0,
  final: 0,
  missed: 0,
  settledCount: 0,
  settledPoints: 0
};

/**
 * Did this member miss this game?
 *
 * Prefer the settled outcome whenever grading has written one: `pick_settlement` is the sole
 * settlement authority (ADR-0007) and already applies ADR-0040's unlined-game exemption and
 * ADR-0037's participation boundary, so it knows things this screen cannot.
 *
 * Only when no settlement exists yet — a game that kicked off minutes ago, before the grade
 * cron ran — fall back to the local read: no locked pick, on a game that actually had a line
 * to pick. A game with no posted line is unpickable (#802) and carries no missed penalty
 * (#803 / ADR-0040), so counting it here would invent a penalty grading will never charge.
 */
function isMissed(game: PickGame, entry: PickEntry | undefined): boolean {
  if (entry?.outcome != null) return entry.outcome === 'missed';
  return !entry?.lockedPick && hasLine(game);
}

/**
 * Summarise the games that have already kicked off. `underway` is the caller's already-filtered
 * set (the board owns the kickoff-vs-now comparison, and the frozen demo substitutes its own
 * split for it), so this stays a pure function of the two inputs with no clock of its own.
 */
export function weekUnderwayCounts(
  underway: PickGame[],
  picks: Record<string, PickEntry>
): WeekUnderwayCounts {
  if (underway.length === 0) return EMPTY;

  const counts: WeekUnderwayCounts = { ...EMPTY, total: underway.length };

  for (const game of underway) {
    const entry = picks[game.id];

    if (game.finalScores) counts.final += 1;
    else counts.inPlay += 1;

    if (isMissed(game, entry)) counts.missed += 1;

    if (entry?.outcome != null) {
      counts.settledCount += 1;
      counts.settledPoints += entry.pointsDelta ?? 0;
    }
  }

  return counts;
}

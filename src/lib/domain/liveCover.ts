// Display-only live ATS cover state for the Sunday sweat board (issue #386).
//
// This is a pure TS MIRROR of the SQL grading path — `ats_margin_at_lock.sql` +
// `grade_pick.sql` (ADR-0007) — evaluated against the live ESPN score instead of the
// final one. It never writes anything and is never the settlement authority: grading,
// run by the grade cron, remains the sole source of standings/points. Keep this textually
// in sync with those two functions; the parity unit test (`__tests__/liveCover.test.ts`)
// enforces it.
import type { WeightCode } from '$lib/types/domain';
import { weightPoints } from './scoring';

/** How a pick is doing against the spread right now. Mirrors `pick_outcome` (win/loss/push)
 *  but named for the live, unofficial framing. */
export type CoverVerdict = 'covering' | 'not_covering' | 'push';

/**
 * ATS margin from the home team's perspective at the locked line. Mirror of
 * `public.ats_margin_at_lock`: point differential adjusted by the locked spread, signed so
 * that `> 0` means the home side has covered, `< 0` the away side, `0` a push (exactly on
 * the number). `spreadTeamId` is whichever side the stored `spreadValue` is quoted for.
 */
export function atsMarginAtLock(
  homePts: number,
  awayPts: number,
  homeId: number,
  awayId: number,
  spreadTeamId: number | null,
  spreadValue: number | null
): number {
  const adj =
    spreadValue == null || spreadTeamId == null
      ? 0
      : spreadTeamId === homeId
        ? -Math.abs(spreadValue)
        : spreadTeamId === awayId
          ? Math.abs(spreadValue)
          : 0;
  return homePts - awayPts + adj;
}

export type LiveCoverInput = {
  homeScore: number;
  awayScore: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  /** The team the player took (frozen on the pick row). */
  pickedTeamId: number | null;
  /** The side the locked spread is quoted for, and its magnitude — both frozen at lock. */
  lockedSpreadTeamId: number | null;
  lockedSpreadValue: number | null;
};

export type LiveCoverState = {
  verdict: CoverVerdict;
  /** ATS margin from the home perspective (mirror of `ats_margin_at_lock`). */
  margin: number;
  /**
   * Cushion from the PICKED side's perspective: how many points the pick is currently
   * covering by (`> 0`), trailing the number by (`< 0`), or sitting exactly on (`0`). This
   * is the "needs N more" / "up by N" number shown on the card.
   */
  cushion: number;
};

/**
 * Live cover state for one pick, or `null` when it cannot be computed (missing team ids or
 * an unpicked game). Mirror of `grade_pick`'s win/loss/push branch: a positive home margin
 * with a home pick — or a negative home margin with an away pick — is covering; `margin === 0`
 * is a push; anything else is not covering.
 */
export function liveCoverState(input: LiveCoverInput): LiveCoverState | null {
  const { homeScore, awayScore, homeTeamId, awayTeamId, pickedTeamId } = input;
  if (homeTeamId == null || awayTeamId == null || pickedTeamId == null) return null;
  if (pickedTeamId !== homeTeamId && pickedTeamId !== awayTeamId) return null;

  const margin = atsMarginAtLock(
    homeScore,
    awayScore,
    homeTeamId,
    awayTeamId,
    input.lockedSpreadTeamId,
    input.lockedSpreadValue
  );

  // Cushion is the margin from the picked side's perspective: flip the sign for an away pick.
  const cushion = pickedTeamId === homeTeamId ? margin : -margin;

  const verdict: CoverVerdict = cushion === 0 ? 'push' : cushion > 0 ? 'covering' : 'not_covering';
  return { verdict, margin, cushion };
}

/**
 * One decided pick's contribution to the live "week so far" projection: its weight and its
 * current verdict. `verdict === null` (game not started / no live data) is undecided and
 * contributes nothing.
 */
export type WeekSoFarPick = {
  weight: WeightCode | null;
  verdict: CoverVerdict | null;
};

/**
 * Live projected points for the week from the decided-so-far picks — the unofficial mirror
 * of what grading would award: `+weight` for a covering pick, `−weight` for one not
 * covering, `0` for a push or an undecided/undated game. Sums both in-progress and
 * unofficial-final picks, exactly as the summary bar shows them. Display-only.
 */
export function weekSoFarPoints(picks: WeekSoFarPick[]): number {
  let total = 0;
  for (const p of picks) {
    if (!p.weight || p.verdict == null || p.verdict === 'push') continue;
    const pts = weightPoints(p.weight);
    total += p.verdict === 'covering' ? pts : -pts;
  }
  return total;
}

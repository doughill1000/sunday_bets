// Presentation helpers for a GRADED pick outcome — the settled `pick_settlement.outcome`.
//
// The graded twin of `$lib/live/display.ts` (which owns the display-only live *cover verdict*).
// Keeping the two apart is deliberate: they use the same semantic tokens but say different
// things, and a row must never read as settled when it is only projected. Extracted from
// `WeeklyPickCard` (#823) so the Weekly tab and the picks board colour a settled result
// identically rather than each keeping its own copy of the map.
import type { GameResult } from '$lib/types/domain';

type Outcome = GameResult | null | undefined;

/** Text colour token for a settled outcome, or `''` to inherit. `missed` inherits deliberately:
 *  it is a real settled result, but every surface that shows it already flags the miss in red on
 *  its own line — colouring it twice reads as two problems. */
export function outcomeTextClass(outcome: Outcome): string {
  if (outcome === 'win') return 'text-success';
  if (outcome === 'loss') return 'text-destructive';
  if (outcome === 'push') return 'text-warning';
  return '';
}

/** Tinted row background for a settled outcome (the Weekly tab's per-team block). */
export function outcomeRowClass(outcome: Outcome): string {
  if (outcome === 'win') return 'bg-success/10';
  if (outcome === 'loss') return 'bg-destructive/10';
  return '';
}

/**
 * Short settled phrase with its points swing, e.g. "Win +3", "Loss −3", "Push", "Missed −1".
 * `pointsDelta` is the settled swing grading wrote (already carrying any missed-pick penalty);
 * omit it (null) and the phrase is the bare outcome word. Deliberately worded differently from
 * the live `verdictLabel` ("Covering +3.5"), whose number is a spread cushion, not points.
 */
export function outcomeLabel(outcome: Outcome, pointsDelta: number | null = null): string {
  const word =
    outcome === 'win'
      ? 'Win'
      : outcome === 'loss'
        ? 'Loss'
        : outcome === 'push'
          ? 'Push'
          : outcome === 'missed'
            ? 'Missed'
            : null;
  if (!word) return '';
  // A zero swing (a push, or a non-scoring round) adds nothing — leave the word to stand alone.
  if (pointsDelta == null || pointsDelta === 0) return word;
  return `${word} ${pointsDelta > 0 ? '+' : '−'}${Math.abs(pointsDelta)}`;
}

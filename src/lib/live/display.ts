// Presentation helpers for a live cover verdict (#386), shared by the locked-card badge and
// the group-pick dots so the colour language stays consistent. Purely display; the verdict
// itself comes from the display-only `liveCoverState` mirror of grading.
import type { CoverVerdict } from '$lib/domain/liveCover';

/** Text/border colour token for a verdict. Uses the semantic tokens (success/destructive/
 *  warning) so it tracks the theme (ADR-0029). */
export function verdictTextClass(verdict: CoverVerdict): string {
  return verdict === 'covering'
    ? 'text-success'
    : verdict === 'not_covering'
      ? 'text-destructive'
      : 'text-warning';
}

/** Background token for the small solid cover dot next to a group member. */
export function verdictDotClass(verdict: CoverVerdict): string {
  return verdict === 'covering'
    ? 'bg-success'
    : verdict === 'not_covering'
      ? 'bg-destructive'
      : 'bg-warning';
}

/** Accessible label for a verdict (screen readers / `title`). */
export function verdictAria(verdict: CoverVerdict): string {
  return verdict === 'covering'
    ? 'Currently covering'
    : verdict === 'not_covering'
      ? 'Not currently covering'
      : 'On the number (push)';
}

/** Format a cushion/spread number tersely: drop a trailing `.0`, keep the `.5`. */
export function fmtPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Short verdict phrase with its cushion for the locked card, e.g. "Covering +3",
 * "Not covering −1.5", "Push". `cushion` is signed from the picked side's perspective.
 */
export function verdictLabel(verdict: CoverVerdict, cushion: number): string {
  if (verdict === 'push') return 'Push';
  if (verdict === 'covering') return `Covering +${fmtPoints(cushion)}`;
  return `Not covering −${fmtPoints(Math.abs(cushion))}`;
}

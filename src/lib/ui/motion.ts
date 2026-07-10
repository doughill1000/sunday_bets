// Local motion helper for the routine pick lock/unlock micro-interaction.
//
// This is deliberately NOT a repo-wide motion/animation design system — it is a
// tiny, local duration constant plus a reduced-motion collapse, scoped to the
// /picks lock flow (issue #478). A shared motion-token system would be a
// cross-cutting pattern that warrants its own ADR.

/**
 * Duration (ms) of the lock/unlock transition on the picks board.
 *
 * Kept short (~150–200ms) on purpose: locking is a high-frequency action, so
 * anything celebratory-length becomes fatigue by the 8th lock. The theatrical
 * budget is reserved for the All-In signature moment (ADR-0023) — this routine
 * tier stays quieter.
 */
export const LOCK_MOTION_MS = 180;

/**
 * Resolve the lock-motion duration, collapsing to 0 (instant, no motion) when the
 * viewer prefers reduced motion. Pass `prefersReducedMotion.current` from
 * `svelte/motion`.
 */
export function lockMotionMs(reduced: boolean): number {
  return reduced ? 0 : LOCK_MOTION_MS;
}

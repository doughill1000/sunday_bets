// Sanctioned JS consumer of the repo-wide motion ramp for the routine pick
// lock/unlock micro-interaction — not a parallel system. The duration tokens and
// the reduced-motion rule live in `src/app.css` (`--duration-*`) and are
// documented in `docs/agent-context/design-system.md` (§Motion, ADR-0029). This
// helper exists because the picks lock timing is driven from JS (Svelte
// transitions) rather than a CSS class, and it collapses its own timing for
// reduced motion in addition to the global `app.css` fallback.

/**
 * Duration (ms) of the lock/unlock transition on the picks board.
 *
 * Equals `--duration-base` (200ms) — the ramp's default transition. Locking is a
 * high-frequency action, so anything celebratory-length becomes fatigue by the
 * 8th lock; the theatrical budget is reserved for the All-In signature moment
 * (ADR-0023) and lives on the slower tokens (`--duration-slow`/`-deliberate`).
 * Keep this equal to a `--duration-*` value rather than a bespoke number.
 */
export const LOCK_MOTION_MS = 200;

/**
 * Resolve the lock-motion duration, collapsing to 0 (instant, no motion) when the
 * viewer prefers reduced motion. Pass `prefersReducedMotion.current` from
 * `svelte/motion`.
 */
export function lockMotionMs(reduced: boolean): number {
  return reduced ? 0 : LOCK_MOTION_MS;
}

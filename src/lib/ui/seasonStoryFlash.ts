/**
 * Which season-story flash — if any — may interrupt this app open (#742).
 *
 * Season Wrapped and the weekly recap each own a modal that fires from the root layout
 * with its own server-side seen marker (`wrapped_seen` / `recap_seen`). Left alone they
 * both open on the same first paint and stack, because neither knows the other exists.
 * This module is the one place that decides: **at most one flash per app open, the bigger
 * season moment first.**
 *
 * Each flash keeps its own seen state, so a flash that loses here is not marked seen — it
 * simply re-attempts on a later open, once the winner has been dismissed.
 */

/** The season-story flashes competing for the first-open moment. */
export type SeasonStoryFlashKind = 'wrapped' | 'recap';

export type SeasonStoryFlashCandidate = {
  /** The flash has something to say (its row loaded). */
  hasContent: boolean;
  /** The player already saw this exact flash (cross-device seen marker). */
  alreadySeen: boolean;
  /** Route-level suppression — e.g. Wrapped on `/wrapped`, which already renders it inline. */
  suppressed?: boolean;
};

/**
 * Priority order, highest first: Wrapped is the once-a-season moment and outranks the
 * weekly recap. Order in this array *is* the rule.
 */
const FLASH_PRIORITY = ['wrapped', 'recap'] as const satisfies readonly SeasonStoryFlashKind[];

function isPending(candidate: SeasonStoryFlashCandidate): boolean {
  return candidate.hasContent && !candidate.alreadySeen && !candidate.suppressed;
}

/**
 * Pick the single flash allowed to show, or `null` when none is pending.
 */
export function selectSeasonStoryFlash(
  candidates: Record<SeasonStoryFlashKind, SeasonStoryFlashCandidate>
): SeasonStoryFlashKind | null {
  return FLASH_PRIORITY.find((kind) => isPending(candidates[kind])) ?? null;
}

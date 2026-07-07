// Pure helpers for rendering league ATS records (issue #406). Kept out of the components
// so the cover-% rule lives in one place and can be unit-tested.
import type { AtsRecord } from '$lib/types/server/league';

/**
 * Cover % as a 0-1 fraction: wins / (wins + losses), pushes excluded from the denominator
 * (a push is a no-decision, not a loss). Returns null when there are no decided games, so
 * the UI can show "--" instead of a misleading 0%.
 */
export function coverPct(rec: Pick<AtsRecord, 'wins' | 'losses'>): number | null {
  const decided = rec.wins + rec.losses;
  return decided > 0 ? rec.wins / decided : null;
}

/** Total games represented by a record (wins + losses + pushes) — the sample size `n`. */
export function recordSampleSize(rec: AtsRecord): number {
  return rec.wins + rec.losses + rec.pushes;
}

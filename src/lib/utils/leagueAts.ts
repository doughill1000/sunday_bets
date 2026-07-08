// Pure helpers for rendering league ATS records (issue #406). Kept out of the components
// so the cover-% rule lives in one place and can be unit-tested.
import type { AtsRecord, LeagueSpreadBucket } from '$lib/types/server/league';

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

/** Fewest decided (non-push) games a spread bucket needs before its favorite cover % is worth
 *  showing; below it the rate is too noisy and the UI shows a sample caveat instead. Buckets
 *  slice a season into five line-size bins, so thin seasons (the 2022–24 imports) easily land
 *  a bucket below this floor. */
export const MIN_BUCKET_SAMPLE = 5;

/**
 * The favorite cover % to display for a spread bucket, or null when the bucket is too thin to
 * show a rate (the pick'em bucket has no favorite, so it is always null). Reuses `coverPct`
 * for the actual math — buckets never compute cover rates a second way (issue #426). A null
 * result means the UI shows the sample caveat rather than a misleading number.
 */
export function bucketCoverPct(
  bucket: Pick<LeagueSpreadBucket, 'favoriteCovers' | 'underdogCovers'>
): number | null {
  const decided = bucket.favoriteCovers + bucket.underdogCovers;
  if (decided < MIN_BUCKET_SAMPLE) return null;
  return coverPct({ wins: bucket.favoriteCovers, losses: bucket.underdogCovers });
}

// Pure helpers for rendering league ATS records (issue #406). Kept out of the components
// so the cover-% rule lives in one place and can be unit-tested.
import type { AtsRecord, LeagueSpreadBucket, PrimetimeSlot } from '$lib/types/server/league';

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

/**
 * Display order for the primetime module (issue #427): the three night windows first, then
 * daytime as the baseline they are read against. The view returns slots in group order, so
 * the query sorts by this before handing rows to the UI.
 */
export const PRIMETIME_SLOT_ORDER: readonly PrimetimeSlot[] = ['TNF', 'SNF', 'MNF', 'day'];

/** Human labels for each kickoff slot. */
export const PRIMETIME_SLOT_LABEL: Record<PrimetimeSlot, string> = {
  TNF: 'Thursday night',
  SNF: 'Sunday night',
  MNF: 'Monday night',
  day: 'Daytime'
};

/**
 * Below this many games a league-wide split (a primetime slot, a divisional bucket) is too
 * thin to read as signal — a full-season primetime slot lands near ~17 games, so this flags
 * early-in-season cells and the sparser imported seasons (2022–24) rather than presenting a
 * noisy cover %. The UI attaches an `n=` caveat to such cells instead of hiding them.
 */
export const LEAGUE_THIN_SAMPLE = 10;

/** Whether a league split cell is thin enough to warrant an `n=` small-sample caveat. */
export function isThinSample(games: number): boolean {
  return games < LEAGUE_THIN_SAMPLE;
}

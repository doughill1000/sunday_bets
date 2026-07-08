import { describe, it, expect } from 'vitest';
import {
  coverPct,
  recordSampleSize,
  bucketCoverPct,
  MIN_BUCKET_SAMPLE
} from '$lib/utils/leagueAts';

describe('coverPct', () => {
  it('is wins / (wins + losses)', () => {
    expect(coverPct({ wins: 6, losses: 2 })).toBeCloseTo(0.75);
  });

  it('excludes pushes from the denominator (they are no-decisions)', () => {
    // With the AtsRecord shape pushes are simply not passed in; a 3-1 record is 0.75
    // regardless of how many pushes sat alongside it.
    expect(coverPct({ wins: 3, losses: 1 })).toBeCloseTo(0.75);
  });

  it('returns null when there are no decided games (avoids a misleading 0%)', () => {
    expect(coverPct({ wins: 0, losses: 0 })).toBeNull();
  });

  it('returns 1 for all covers and 0 for all losses', () => {
    expect(coverPct({ wins: 4, losses: 0 })).toBe(1);
    expect(coverPct({ wins: 0, losses: 5 })).toBe(0);
  });
});

describe('recordSampleSize', () => {
  it('sums wins, losses, and pushes', () => {
    expect(recordSampleSize({ wins: 6, losses: 2, pushes: 1 })).toBe(9);
  });

  it('is zero for an empty record', () => {
    expect(recordSampleSize({ wins: 0, losses: 0, pushes: 0 })).toBe(0);
  });
});

describe('bucketCoverPct', () => {
  it('is the favorite cover % once enough games are decided', () => {
    // 6-2 favorite = 8 decided (>= MIN_BUCKET_SAMPLE) -> 0.75.
    expect(bucketCoverPct({ favoriteCovers: 6, underdogCovers: 2 })).toBeCloseTo(0.75);
  });

  it('reuses coverPct: pushes are already excluded from the counts', () => {
    expect(bucketCoverPct({ favoriteCovers: 5, underdogCovers: 0 })).toBe(1);
  });

  it('returns null for a thin bucket (below the sample floor) to force the caveat', () => {
    // 3-1 = 4 decided, one short of MIN_BUCKET_SAMPLE (5): too noisy to show a rate.
    expect(MIN_BUCKET_SAMPLE).toBe(5);
    expect(bucketCoverPct({ favoriteCovers: 3, underdogCovers: 1 })).toBeNull();
  });

  it('returns null for the pick’em bucket (no favorite decisions at all)', () => {
    expect(bucketCoverPct({ favoriteCovers: 0, underdogCovers: 0 })).toBeNull();
  });

  it('shows a rate exactly at the sample floor', () => {
    expect(bucketCoverPct({ favoriteCovers: 3, underdogCovers: 2 })).toBeCloseTo(0.6);
  });
});

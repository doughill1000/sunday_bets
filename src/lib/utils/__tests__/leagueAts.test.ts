import { describe, it, expect } from 'vitest';
import {
  coverPct,
  isThinSample,
  LEAGUE_THIN_SAMPLE,
  PRIMETIME_SLOT_LABEL,
  PRIMETIME_SLOT_ORDER,
  recordSampleSize
} from '$lib/utils/leagueAts';
import type { PrimetimeSlot } from '$lib/types/server/league';

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

describe('isThinSample (issue #427)', () => {
  it('flags cells below the threshold', () => {
    expect(isThinSample(LEAGUE_THIN_SAMPLE - 1)).toBe(true);
    expect(isThinSample(0)).toBe(true);
  });

  it('does not flag cells at or above the threshold', () => {
    expect(isThinSample(LEAGUE_THIN_SAMPLE)).toBe(false);
    expect(isThinSample(LEAGUE_THIN_SAMPLE + 5)).toBe(false);
  });
});

describe('primetime slot order + labels (issue #427)', () => {
  it('orders the three night windows before daytime', () => {
    expect(PRIMETIME_SLOT_ORDER).toEqual(['TNF', 'SNF', 'MNF', 'day']);
  });

  it('has a human label for every slot in the order (no gaps)', () => {
    for (const slot of PRIMETIME_SLOT_ORDER) {
      expect(PRIMETIME_SLOT_LABEL[slot]).toBeTruthy();
    }
    // The label map covers exactly the ordered slots — no extra or missing keys.
    expect(Object.keys(PRIMETIME_SLOT_LABEL).sort()).toEqual([...PRIMETIME_SLOT_ORDER].sort());
  });

  it('every ordered slot is a valid PrimetimeSlot', () => {
    const valid: PrimetimeSlot[] = ['TNF', 'SNF', 'MNF', 'day'];
    for (const slot of PRIMETIME_SLOT_ORDER) {
      expect(valid).toContain(slot);
    }
  });
});

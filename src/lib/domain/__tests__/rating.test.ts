import { describe, it, expect } from 'vitest';
import {
  RATING_PAR,
  MIN_QUALIFIED_DECISIONS,
  ratingTier,
  tierLabel,
  meterPct,
  ratingRank,
  type PlayerRatingEntry
} from '$lib/domain/rating';

const entry = (user_id: string, rating: number | null): PlayerRatingEntry => ({
  user_id,
  rating,
  decisions: rating == null ? 5 : 40,
  decisionsToQualify: rating == null ? MIN_QUALIFIED_DECISIONS - 5 : 0,
  seasonDelta: rating == null ? null : 0
});

describe('ratingTier', () => {
  it('bands below par as Square', () => {
    expect(ratingTier(1499)).toBe('square');
    expect(ratingTier(1400)).toBe('square');
  });

  it('bands par and just above as Solid (reconciles with the study 1533 Solid)', () => {
    expect(ratingTier(RATING_PAR)).toBe('solid');
    expect(ratingTier(1533)).toBe('solid');
    expect(ratingTier(1539)).toBe('solid');
  });

  it('bands a sustained edge as Sharp (study 1554 Sharp)', () => {
    expect(ratingTier(1540)).toBe('sharp');
    expect(ratingTier(1554)).toBe('sharp');
    expect(ratingTier(1579)).toBe('sharp');
  });

  it('bands the top as Shark (study 1602 Shark)', () => {
    expect(ratingTier(1580)).toBe('shark');
    expect(ratingTier(1602)).toBe('shark');
  });

  it('is total and monotonic across the boundaries', () => {
    const order = { square: 0, solid: 1, sharp: 2, shark: 3 };
    let prev = -1;
    for (let r = 1400; r <= 1650; r += 1) {
      const rank = order[ratingTier(r)];
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });
});

describe('tierLabel', () => {
  it('maps each tier to its display word', () => {
    expect(tierLabel('square')).toBe('Square');
    expect(tierLabel('solid')).toBe('Solid');
    expect(tierLabel('sharp')).toBe('Sharp');
    expect(tierLabel('shark')).toBe('Shark');
  });
});

describe('meterPct', () => {
  it('puts par at the midpoint', () => {
    expect(meterPct(RATING_PAR)).toBe(50);
  });

  it('clamps to [0, 100] outside the ±150 window', () => {
    expect(meterPct(1200)).toBe(0);
    expect(meterPct(1900)).toBe(100);
    expect(meterPct(1650)).toBe(100);
    expect(meterPct(1350)).toBe(0);
  });

  it('reads ~68% at the study exemplar 1554', () => {
    expect(Math.round(meterPct(1554))).toBe(68);
  });
});

describe('ratingRank', () => {
  const entries: PlayerRatingEntry[] = [
    entry('marcus', 1602),
    entry('you', 1554),
    entry('colin', 1533),
    entry('rey', null) // unrated
  ];

  it('dense-ranks qualified players by rating desc', () => {
    expect(ratingRank(entries, 'marcus')).toBe(1);
    expect(ratingRank(entries, 'you')).toBe(2);
    expect(ratingRank(entries, 'colin')).toBe(3);
  });

  it('returns null for an unrated player', () => {
    expect(ratingRank(entries, 'rey')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(ratingRank(entries, 'nobody')).toBeNull();
  });

  it('shares a rank on ties and does not count unrated players', () => {
    const tied: PlayerRatingEntry[] = [
      entry('a', 1560),
      entry('b', 1560),
      entry('c', 1540),
      entry('d', null)
    ];
    expect(ratingRank(tied, 'a')).toBe(1);
    expect(ratingRank(tied, 'b')).toBe(1);
    // Two players share rank 1; the next distinct rating is rank 2 (dense ranking).
    expect(ratingRank(tied, 'c')).toBe(2);
  });
});

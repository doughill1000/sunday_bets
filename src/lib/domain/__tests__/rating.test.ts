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

  it('bands par up to (but not including) 1508 as Solid', () => {
    expect(ratingTier(RATING_PAR)).toBe('solid');
    expect(ratingTier(1503)).toBe('solid');
    expect(ratingTier(1507)).toBe('solid');
  });

  it('bands 1508 up to (but not including) 1520 as Sharp', () => {
    expect(ratingTier(1508)).toBe('sharp');
    expect(ratingTier(1513)).toBe('sharp');
    expect(ratingTier(1519)).toBe('sharp');
  });

  it('bands 1520 and above as Shark', () => {
    expect(ratingTier(1520)).toBe('shark');
    expect(ratingTier(1522)).toBe('shark');
    expect(ratingTier(1550)).toBe('shark');
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

  it('clamps to [0, 100] outside the new, tighter ±50 window', () => {
    expect(meterPct(1200)).toBe(0);
    expect(meterPct(1900)).toBe(100);
    expect(meterPct(1550)).toBe(100);
    expect(meterPct(1450)).toBe(0);
  });

  it('reads 75% at 1525, a comfortable edge inside the ±50 window', () => {
    expect(meterPct(1525)).toBe(75);
  });

  it('reads 58% at the Sharp threshold (1508) and 70% at the Shark threshold (1520)', () => {
    expect(meterPct(1508)).toBe(58);
    expect(meterPct(1520)).toBe(70);
  });
});

describe('ratingRank', () => {
  const entries: PlayerRatingEntry[] = [
    entry('marcus', 1522),
    entry('you', 1513),
    entry('colin', 1503),
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
      entry('a', 1512),
      entry('b', 1512),
      entry('c', 1505),
      entry('d', null)
    ];
    expect(ratingRank(tied, 'a')).toBe(1);
    expect(ratingRank(tied, 'b')).toBe(1);
    // Two players share rank 1; the next distinct rating is rank 2 (dense ranking).
    expect(ratingRank(tied, 'c')).toBe(2);
  });
});

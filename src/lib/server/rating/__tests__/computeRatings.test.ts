import { describe, it, expect } from 'vitest';
import {
  computePlayerRatings,
  RATING_CONSTANTS,
  type RatingDecision,
  type RatingOutcome
} from '$lib/server/rating/computeRatings';
import { RATING_PAR, MIN_QUALIFIED_DECISIONS, type PlayerRatingEntry } from '$lib/domain/rating';
import type { WeightCode } from '$lib/types/domain';

// ── Builders ──────────────────────────────────────────────────────────────────
// A game's kickoff is derived from its ordinal so decisions have a deterministic chronology;
// seasons are kept temporally disjoint (year embedded in the timestamp).
function decision(
  i: number,
  outcome: RatingOutcome,
  opts: {
    group?: string;
    user?: string;
    season?: number;
    weight?: WeightCode;
  } = {}
): RatingDecision {
  const season = opts.season ?? 2024;
  const mm = String((i % 11) + 1).padStart(2, '0');
  const dd = String((i % 27) + 1).padStart(2, '0');
  const hh = String(i % 24).padStart(2, '0');
  return {
    group_id: opts.group ?? 'g1',
    user_id: opts.user ?? 'u1',
    season_year: season,
    commence_time: `${season}-${mm}-${dd}T${hh}:00:00+00:00`,
    game_id: `game-${season}-${String(i).padStart(4, '0')}`,
    weight: opts.weight ?? 'M',
    outcome
  };
}

function run(rows: RatingDecision[]): PlayerRatingEntry[] {
  return computePlayerRatings(rows);
}

function seq(
  count: number,
  outcome: RatingOutcome,
  opts: Parameters<typeof decision>[2] = {}
): RatingDecision[] {
  return Array.from({ length: count }, (_, i) => decision(i, outcome, opts));
}

describe('computePlayerRatings — structure', () => {
  it('returns nothing for no decisions', () => {
    expect(run([])).toEqual([]);
  });

  it('keys one result per (group, user)', () => {
    const rows = [
      ...seq(25, 'win', { group: 'g1', user: 'a' }),
      ...seq(25, 'loss', { group: 'g1', user: 'b' }),
      ...seq(25, 'win', { group: 'g2', user: 'a' })
    ];
    const out = run(rows);
    expect(out).toHaveLength(3);
    expect(out.map((r) => `${r.user_id}`).sort()).toEqual(['a', 'a', 'b']);
  });

  it('isolates the same user across two groups (per (group,user), ADR-0032 §6)', () => {
    // Same user_id: all wins in group g1, all losses in group g2 → divergent ratings.
    const rows = [
      ...seq(30, 'win', { group: 'g1', user: 'shared' }),
      ...seq(30, 'loss', { group: 'g2', user: 'shared' })
    ];
    const out = run(rows);
    const g1 = out.find((r) => r.user_id === 'shared' && r.rating != null && r.rating > RATING_PAR);
    const g2 = out.find((r) => r.user_id === 'shared' && r.rating != null && r.rating < RATING_PAR);
    expect(g1).toBeDefined();
    expect(g2).toBeDefined();
  });
});

describe('computePlayerRatings — hidden until qualified (ADR-0032 §5)', () => {
  it('is Unrated below the threshold, with a decisions-to-go count and no number', () => {
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS - 1, 'win'));
    expect(r.rating).toBeNull();
    expect(r.seasonDelta).toBeNull();
    expect(r.decisions).toBe(MIN_QUALIFIED_DECISIONS - 1);
    expect(r.decisionsToQualify).toBe(1);
  });

  it('qualifies at exactly the threshold', () => {
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS, 'win'));
    expect(r.rating).not.toBeNull();
    expect(r.decisions).toBe(MIN_QUALIFIED_DECISIONS);
    expect(r.decisionsToQualify).toBe(0);
    expect(r.seasonDelta).not.toBeNull();
  });

  it('counts every settled decision toward the gate, win or lose', () => {
    const rows = [...seq(10, 'win'), ...seq(10, 'loss')];
    const [r] = run(rows);
    expect(r.decisions).toBe(20);
    expect(r.rating).not.toBeNull();
  });
});

describe('computePlayerRatings — direction & par', () => {
  it('rates a consistent winner above par', () => {
    const [r] = run(seq(30, 'win'));
    expect(r.rating!).toBeGreaterThan(RATING_PAR);
  });

  it('rates a consistent loser below par', () => {
    const [r] = run(seq(30, 'loss'));
    expect(r.rating!).toBeLessThan(RATING_PAR);
  });

  it('leaves an all-push player exactly at par with a flat season delta', () => {
    // At par the expected score is 0.5, so a push (0.5) never moves the rating.
    const [r] = run(seq(30, 'push'));
    expect(r.rating).toBe(RATING_PAR);
    expect(r.seasonDelta).toBe(0);
  });
});

describe('computePlayerRatings — determinism (fairness criterion)', () => {
  it('is invariant to input row order (it sorts chronologically inside)', () => {
    const rows = [...seq(15, 'win', { season: 2023 }), ...seq(15, 'loss', { season: 2024 })];
    const forward = run(rows);
    const shuffled = run([...rows].reverse());
    expect(shuffled).toEqual(forward);
  });

  it('produces identical output on repeated runs', () => {
    const rows = [...seq(12, 'win'), ...seq(9, 'loss'), ...seq(4, 'push')];
    expect(run(rows)).toEqual(run(rows));
  });
});

describe('computePlayerRatings — conviction weighting (ADR-0032 §2)', () => {
  it('moves the rating more for higher-conviction wins', () => {
    const allIn = run(seq(25, 'win', { weight: 'A', user: 'allin' }))[0];
    const medium = run(seq(25, 'win', { weight: 'M', user: 'med' }))[0];
    const low = run(seq(25, 'win', { weight: 'L', user: 'low' }))[0];
    expect(allIn.rating!).toBeGreaterThan(medium.rating!);
    expect(medium.rating!).toBeGreaterThan(low.rating!);
  });

  it('the conviction ladder is monotone L < M < H < A', () => {
    const CONV: WeightCode[] = ['L', 'M', 'H', 'A'];
    const ratings = CONV.map(
      (w, idx) => run(seq(25, 'win', { weight: w, user: `w${idx}` }))[0].rating!
    );
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeGreaterThan(ratings[i - 1]);
    }
  });
});

describe('computePlayerRatings — soft season reset (ADR-0032 §4)', () => {
  it('season delta is scoped to the latest season, not the lifetime gain', () => {
    // A strong 2023, then a single push in 2024. The 2024 delta reflects only 2024 (≈0), while
    // the overall rating stays well above par from 2023 — proving 2024 opened at a fresh,
    // regressed anchor rather than carrying the whole lifetime climb into the delta.
    const rows = [...seq(25, 'win', { season: 2023 }), decision(0, 'push', { season: 2024 })];
    const [r] = run(rows);
    expect(r.rating!).toBeGreaterThan(1520);
    expect(r.seasonDelta!).toBeGreaterThanOrEqual(-2);
    expect(r.seasonDelta!).toBeLessThanOrEqual(0);
  });

  it('contrast: the same picks in ONE season put the whole climb in the delta', () => {
    // Identical outcomes but all in 2024 (no boundary) → the delta is the full climb from par.
    const rows = [...seq(25, 'win', { season: 2024 }), decision(99, 'push', { season: 2024 })];
    const [r] = run(rows);
    expect(r.seasonDelta!).toBeGreaterThan(15);
  });

  it('regresses a prior reputation toward par at a season boundary', () => {
    // Same 40 wins: one player in a single season, one split across two seasons. The split player
    // is set back once toward par, so ends at or below the single-season player.
    const single = run(seq(40, 'win', { season: 2024, user: 'single' }))[0];
    const split = run([
      ...seq(20, 'win', { season: 2023, user: 'split' }),
      ...seq(20, 'win', { season: 2024, user: 'split' })
    ])[0];
    expect(split.rating!).toBeLessThanOrEqual(single.rating!);
    expect(split.rating!).toBeGreaterThan(RATING_PAR);
  });
});

describe('computePlayerRatings — rounding & shape', () => {
  it('returns an integer rating and integer season delta', () => {
    const [r] = run([...seq(20, 'win'), ...seq(10, 'loss')]);
    expect(Number.isInteger(r.rating!)).toBe(true);
    expect(Number.isInteger(r.seasonDelta!)).toBe(true);
  });

  it('exposes tunable constants without freezing their values', () => {
    expect(RATING_CONSTANTS.SEASON_CARRY).toBeGreaterThan(0);
    expect(RATING_CONSTANTS.SEASON_CARRY).toBeLessThan(1);
    expect(RATING_CONSTANTS.K_BASE).toBeGreaterThan(0);
  });
});

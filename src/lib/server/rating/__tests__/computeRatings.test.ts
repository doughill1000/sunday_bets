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
// commence_time/game_id are still part of the input shape (the view provides them, and rebuild.ts
// selects them unconditionally) but the v2 fold is a pure set aggregation over (season_year,
// outcome) — it never reads them, so their exact values below are arbitrary/deterministic-only.
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

// A mix of wins/losses/pushes, in the given counts, all otherwise sharing `opts`.
function mix(
  wins: number,
  losses: number,
  pushes: number,
  opts: Parameters<typeof decision>[2] = {}
): RatingDecision[] {
  let i = 0;
  const rows: RatingDecision[] = [];
  for (let k = 0; k < wins; k++) rows.push(decision(i++, 'win', opts));
  for (let k = 0; k < losses; k++) rows.push(decision(i++, 'loss', opts));
  for (let k = 0; k < pushes; k++) rows.push(decision(i++, 'push', opts));
  return rows;
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

describe('computePlayerRatings — hand-computed exact values (fairness criterion)', () => {
  // p = (S + 20) / (n + 40); rating = round(1500 + 400*log10(p/(1-p))).
  it('100 wins / 100 losses in one season -> S=100, n=200, p=(100+20)/240=0.5 -> exactly 1500', () => {
    const rows = mix(100, 100, 0, { season: 2024 });
    const [r] = run(rows);
    expect(r.decisions).toBe(200);
    expect(r.rating).toBe(1500);
  });

  it('20 wins / 0 losses (n=20, S=20): p=40/60=2/3 -> rating 1620', () => {
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS, 'win'));
    expect(r.decisions).toBe(20);
    expect(r.rating).toBe(1620);
  });

  it('a mixed 12 win / 9 loss / 4 push record (n=25, S=14): p=34/65 -> rating 1516', () => {
    const rows = mix(12, 9, 4);
    const [r] = run(rows);
    expect(r.decisions).toBe(25);
    expect(r.rating).toBe(1516);
  });

  it('a consistent 30-0 winner (n=30, S=30): p=50/70 -> rating 1659', () => {
    const [r] = run(seq(30, 'win'));
    expect(r.rating).toBe(1659);
  });

  it('a consistent 0-30 loser (n=30, S=0): p=20/70 -> rating 1341', () => {
    const [r] = run(seq(30, 'loss'));
    expect(r.rating).toBe(1341);
  });
});

describe('computePlayerRatings — push counts as exactly 0.5 (ADR-0032)', () => {
  it('a half-push record rates identically to an equal win/loss split (both S=10, n=20 -> par)', () => {
    const winLossSplit = run(mix(10, 10, 0, { user: 'wl' }))[0];
    const allPush = run(seq(20, 'push', { user: 'push' }))[0];
    expect(winLossSplit.rating).toBe(RATING_PAR);
    expect(allPush.rating).toBe(RATING_PAR);
    expect(winLossSplit.rating).toBe(allPush.rating);
  });

  it('an all-push player of any sample size lands exactly at par (S is always exactly n/2)', () => {
    // p = (n*0.5 + 20) / (n + 40) = 0.5 * (n+40) / (n+40) = 0.5 identically, for any n.
    const [r30] = run(seq(30, 'push'));
    const [r75] = run(seq(75, 'push'));
    expect(r30.rating).toBe(RATING_PAR);
    expect(r75.rating).toBe(RATING_PAR);
  });
});

describe('computePlayerRatings — hidden until qualified (ADR-0032 §5)', () => {
  it('is Unrated below the threshold, with a decisions-to-go count, no number, and no season delta', () => {
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS - 1, 'win'));
    expect(r.rating).toBeNull();
    expect(r.seasonDelta).toBeNull();
    expect(r.decisions).toBe(MIN_QUALIFIED_DECISIONS - 1);
    expect(r.decisionsToQualify).toBe(1);
  });

  it('qualifies at exactly the threshold', () => {
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS, 'win'));
    expect(r.rating).toBe(1620);
    expect(r.decisions).toBe(MIN_QUALIFIED_DECISIONS);
    expect(r.decisionsToQualify).toBe(0);
  });

  it('counts every settled decision toward the gate, win or lose (n=20, S=10 -> par)', () => {
    const rows = [...seq(10, 'win'), ...seq(10, 'loss')];
    const [r] = run(rows);
    expect(r.decisions).toBe(20);
    expect(r.rating).toBe(1500);
  });

  it('decisionsToQualify is exactly MIN_QUALIFIED_DECISIONS - n below the gate, for several n', () => {
    for (const n of [1, 5, 12, 19]) {
      const [r] = run(seq(n, 'win', { user: `u${n}` }));
      expect(r.rating).toBeNull();
      expect(r.decisionsToQualify).toBe(MIN_QUALIFIED_DECISIONS - n);
    }
  });
});

describe('computePlayerRatings — shrinkage toward par (ADR-0032 §5)', () => {
  it('a small qualified sample is pulled further toward 1500 than a large sample at the same raw rate', () => {
    // Both 75% raw cover: n=20 (15w/5l) vs n=200 (150w/50l). Same p_raw, very different shrinkage.
    const small = run(mix(15, 5, 0, { user: 'small' }))[0];
    const large = run(mix(150, 50, 0, { user: 'large' }))[0];
    expect(small.rating).toBe(1558);
    expect(large.rating).toBe(1654);
    expect(Math.abs(small.rating! - RATING_PAR)).toBeLessThan(Math.abs(large.rating! - RATING_PAR));
  });

  it('an undefeated small sample never reaches an extreme rating (the prior keeps p off 100%)', () => {
    // 20-0 is a "perfect" record, but shrinkage caps how far that can push the rating.
    const [r] = run(seq(MIN_QUALIFIED_DECISIONS, 'win'));
    expect(r.rating).toBeLessThan(RATING_PAR + 400); // nowhere near the unshrunk asymptote
  });
});

describe('computePlayerRatings — conviction is ignored entirely (ADR-0032 v2)', () => {
  it('identical outcomes rate identically regardless of weight (L/M/H/A all agree)', () => {
    const CONV: WeightCode[] = ['L', 'M', 'H', 'A'];
    const ratings = CONV.map(
      (w, idx) => run(seq(25, 'win', { weight: w, user: `w${idx}` }))[0].rating
    );
    expect(new Set(ratings).size).toBe(1);
  });

  it('a mixed-weight record rates the same as the identical outcomes under a single weight', () => {
    const uniform = run(seq(20, 'win', { weight: 'M', user: 'uniform' }))[0];
    const rows = Array.from({ length: 20 }, (_, i) =>
      decision(i, 'win', { weight: (['L', 'M', 'H', 'A'] as WeightCode[])[i % 4], user: 'varied' })
    );
    const varied = run(rows)[0];
    expect(varied.rating).toBe(uniform.rating);
  });
});

describe('computePlayerRatings — determinism & order-independence (fairness criterion)', () => {
  it('is byte-identical under reversed input order (a pure set aggregation, not a fold)', () => {
    const rows = [...seq(15, 'win', { season: 2023 }), ...seq(15, 'loss', { season: 2024 })];
    const forward = run(rows);
    const reversed = run([...rows].reverse());
    expect(reversed).toEqual(forward);
  });

  it('is byte-identical under an arbitrary shuffle (interleaved, not just reversed)', () => {
    const rows = [
      ...seq(10, 'win', { season: 2022 }),
      ...seq(8, 'loss', { season: 2023 }),
      ...seq(6, 'push', { season: 2024 })
    ];
    // Deterministic "shuffle": interleave by taking every 3rd element starting at each offset.
    const shuffled = [0, 1, 2].flatMap((offset) => rows.filter((_, i) => i % 3 === offset));
    expect(shuffled).toHaveLength(rows.length);
    expect(run(shuffled)).toEqual(run(rows));
  });

  it('produces identical output on repeated runs', () => {
    const rows = [...seq(12, 'win'), ...seq(9, 'loss'), ...seq(4, 'push')];
    expect(run(rows)).toEqual(run(rows));
  });
});

describe('computePlayerRatings — season delta is order-independent (ADR-0032 v2)', () => {
  it('reflects the latest season vs. every prior season combined', () => {
    // 25 wins in 2023 (nPrior=25, SPrior=25), then a single push in 2024 (n=26, S=25.5).
    const rows = [...seq(25, 'win', { season: 2023 }), decision(0, 'push', { season: 2024 })];
    const [r] = run(rows);
    expect(r.decisions).toBe(26);
    expect(r.rating).toBe(1639); // round(1500 + 400*log10(p/(1-p))), p=(25.5+20)/66
    expect(r.seasonDelta).toBe(-2); // round(ratingExact - ratingPriorExact), both unrounded
  });

  it('is null when every settled decision falls in a single season (no prior season to compare)', () => {
    const [r] = run(seq(40, 'win', { season: 2024 }));
    expect(r.rating).toBe(1691);
    expect(r.seasonDelta).toBeNull();
  });

  it('is unaffected by interleaving three seasons out of chronological order in the input', () => {
    const chronological = [
      ...seq(20, 'win', { season: 2022 }),
      ...seq(20, 'loss', { season: 2023 }),
      ...seq(20, 'win', { season: 2024 })
    ];
    // Interleave every 3rd row starting at each offset, so the input alternates seasons rather
    // than arriving in (or simply reversed from) chronological blocks.
    const interleaved = [0, 1, 2].flatMap((offset) =>
      chronological.filter((_, i) => i % 3 === offset)
    );
    expect(run(interleaved)).toEqual(run(chronological));
  });
});

describe('computePlayerRatings — rounding & shape', () => {
  it('returns an integer rating and integer season delta', () => {
    const rows = [...seq(20, 'win', { season: 2023 }), ...seq(10, 'loss', { season: 2024 })];
    const [r] = run(rows);
    expect(Number.isInteger(r.rating!)).toBe(true);
    expect(Number.isInteger(r.seasonDelta!)).toBe(true);
  });

  it('exposes tunable constants without freezing their values', () => {
    expect(RATING_CONSTANTS.ELO_D).toBeGreaterThan(0);
    expect(RATING_CONSTANTS.RATING_PRIOR_STRENGTH).toBeGreaterThan(0);
  });
});

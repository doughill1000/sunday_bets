import { describe, it, expect } from 'vitest';
import {
  computeBadges,
  computeSampleGuard,
  computeOracleGuard,
  computeLemmingGuard,
  badgeInputsFromSeasonStats,
  BADGE_AXES,
  BADGE_GLOSSARY
} from '../badges';
import type {
  BadgeConsensusEntry,
  BadgeInputs,
  BadgeLineSideEntry,
  BadgeSeasonTotalsEntry,
  BadgeWeightEntry,
  BadgeTrendEntry
} from '../badges';
import type { SeasonStats } from '$lib/types/server/stats';
import type { SeasonLeaderboardEntry } from '$lib/types/leaderboard';

// --- Fixture helpers ---

function totals(overrides: Partial<BadgeSeasonTotalsEntry> = {}): BadgeSeasonTotalsEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    decisions: 10,
    wins: 6,
    losses: 4,
    pushes: 0,
    missed: 0,
    ...overrides
  };
}

function weightEntry(overrides: Partial<BadgeWeightEntry> = {}): BadgeWeightEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    weight: 'A',
    decisions: 3,
    wins: 2,
    losses: 1,
    pushes: 0,
    ...overrides
  };
}

function trend(overrides: Partial<BadgeTrendEntry> = {}): BadgeTrendEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    week_number: 1,
    week_wins: 3,
    week_losses: 0,
    week_missed: 0,
    week_points: 10,
    cumulative_rank_this_week: 1,
    ...overrides
  };
}

const EMPTY: BadgeInputs = {
  seasonTotals: [],
  weightAccuracy: [],
  trend: [],
  consensus: [],
  lineSide: []
};

function consensus(overrides: Partial<BadgeConsensusEntry> = {}): BadgeConsensusEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    decisions: 10,
    mean_consensus_pct: 45,
    contrarian_picks: 6,
    contrarian_wins: 4,
    majority_picks: 4,
    majority_wins: 2,
    ...overrides
  };
}

function lineSide(overrides: Partial<BadgeLineSideEntry> = {}): BadgeLineSideEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    decisions: 10,
    chalk_picks: 5,
    dog_picks: 5,
    ...overrides
  };
}

function ids(badges: ReturnType<typeof computeBadges>) {
  return badges.map((b) => b.id);
}

/** The holders of one badge, by display name — the shape most assertions here want. */
function holderNames(badges: ReturnType<typeof computeBadges>, id: string): string[] {
  return badges.find((b) => b.id === id)?.holders.map((h) => h.display_name) ?? [];
}

// --- Sample guard ---

describe('computeSampleGuard', () => {
  it('returns the floor when the list is empty', () => {
    expect(computeSampleGuard([])).toBe(5);
  });

  it('returns the floor for a low-activity season', () => {
    // average = 4 decisions → round(4 * 0.35) = 1 → floor wins
    const small = [totals({ decisions: 4 }), totals({ decisions: 4 })];
    expect(computeSampleGuard(small)).toBe(5);
  });

  it('scales up with a high-activity season', () => {
    // average = 30 → round(30 * 0.35) = 11 > 5
    const busy = [totals({ decisions: 30 }), totals({ decisions: 30 })];
    expect(computeSampleGuard(busy)).toBe(11);
  });
});

// --- Empty / early-season state ---

describe('computeBadges — empty season', () => {
  it('returns no badges when there are no settled picks', () => {
    expect(computeBadges(EMPTY)).toEqual([]);
  });

  it('returns no badges when all players have 0 decisions', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ decisions: 0, wins: 0, losses: 0, pushes: 0, missed: 0 }),
        totals({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          missed: 0
        })
      ]
    };
    expect(computeBadges(inputs)).toEqual([]);
  });
});

// --- The Grinder ---

describe('The Grinder', () => {
  it('awards every player who missed nothing, as a milestone', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 14, missed: 0 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 14, missed: 0 }),
        totals({ user_id: 'u3', display_name: 'Zara', decisions: 14, missed: 3 })
      ]
    };
    const badges = computeBadges(inputs);
    const badge = badges.find((b) => b.id === 'the-grinder');
    // Attendance is a threshold, not a competition: two clean seasons, two winners.
    expect(badge?.kind).toBe('milestone');
    expect(holderNames(badges, 'the-grinder')).toEqual(['Alice', 'Bob']);
  });

  it('is not awarded to a player who missed even one game', () => {
    // 2025 with #650's settlement row restored: Doug missed exactly one game (week 17),
    // so the badge resolves to nobody. Before that row was backfilled his `missed` read 0
    // only because the row was absent, and the badge would have crowned him for a season
    // in which he missed a game.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({
          user_id: 'u1',
          display_name: 'Brett',
          decisions: 272,
          wins: 56,
          losses: 82,
          pushes: 1,
          missed: 133
        }),
        totals({
          user_id: 'u2',
          display_name: 'Doug',
          decisions: 272,
          wins: 132,
          losses: 137,
          pushes: 2,
          missed: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-grinder');
  });

  it('is dark in a season that recorded no misses at all (the 2022-24 legacy gate)', () => {
    // The sheet import never wrote a `missed` row for anyone in 2022-24, so "0 missed" is
    // trivially true for the whole league. Ungated, this would award every player three
    // seasons running. A season that recorded no miss did not measure attendance.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 208, missed: 0 }),
        totals({ user_id: 'u2', display_name: 'Harry', decisions: 208, missed: 0 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-grinder');
  });

  it('shares its gate with The Ghost — the mirror pair goes dark and lights up together', () => {
    const legacy: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 208, missed: 0 }),
        totals({ user_id: 'u2', display_name: 'Harry', decisions: 208, missed: 0 })
      ]
    };
    const measured: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 208, missed: 0 }),
        totals({ user_id: 'u2', display_name: 'Harry', decisions: 208, missed: 4 })
      ]
    };
    const legacyIds = ids(computeBadges(legacy));
    expect(legacyIds).not.toContain('the-grinder');
    expect(legacyIds).not.toContain('the-ghost');

    const measuredIds = ids(computeBadges(measured));
    expect(measuredIds).toContain('the-grinder');
    expect(measuredIds).toContain('the-ghost');
  });

  it('is not awarded when everyone missed something', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 14, missed: 2 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 14, missed: 5 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-grinder');
  });
});

// --- The Choker ---

describe('The Choker', () => {
  it('awards a player shut out on 3+ All-Ins', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Brett' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 3,
          losses: 1,
          decisions: 4
        }),
        // Brett 2025: 0-4. The one shutout on the 2022-25 record.
        weightEntry({
          user_id: 'u2',
          display_name: 'Brett',
          weight: 'A',
          wins: 0,
          losses: 4,
          decisions: 4
        })
      ]
    };
    const badges = computeBadges(inputs);
    expect(badges.find((b) => b.id === 'the-choker')?.kind).toBe('milestone');
    expect(holderNames(badges, 'the-choker')).toEqual(['Brett']);
  });

  it('awards every shut-out player, with no alphabetical filtering', () => {
    // A shutout is a threshold, not a ranking: if two players both go 0-for-3+, both
    // choked. This is exactly the tie the old `alphaFirst` silently resolved.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara' }),
        totals({ user_id: 'u2', display_name: 'Alice' }),
        totals({ user_id: 'u3', display_name: 'Bob' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Zara',
          weight: 'A',
          wins: 0,
          losses: 3,
          decisions: 3
        }),
        weightEntry({
          user_id: 'u2',
          display_name: 'Alice',
          weight: 'A',
          wins: 0,
          losses: 5,
          decisions: 5
        }),
        weightEntry({
          user_id: 'u3',
          display_name: 'Bob',
          weight: 'A',
          wins: 1,
          losses: 4,
          decisions: 5
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'the-choker')).toEqual(['Alice', 'Zara']);
  });

  it('is not awarded to a 1-for-1 All-In loser — the 2022 absurdity', () => {
    // The badge shipped with no guard at all, so 2022 handed a season title to a player
    // on a single lost All-In: one pick, one bad night. The shared WHALE_MIN_ALLINS guard
    // kills this for free.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Frank' })],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Frank',
          weight: 'A',
          wins: 0,
          losses: 1,
          decisions: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-choker');
  });

  it('is not awarded when every All-In player won at least once', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice' })],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 1,
          losses: 9,
          decisions: 10
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-choker');
  });

  it('is not awarded when nobody has an All-In decision', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      weightAccuracy: [weightEntry({ weight: 'L', wins: 5, losses: 5, decisions: 10 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-choker');
  });

  it('is not awarded when all All-In entries have 0 decisions (push-only)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      weightAccuracy: [weightEntry({ weight: 'A', wins: 0, losses: 0, decisions: 1 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-choker');
  });
});

// --- The Whale ---

describe('The Whale', () => {
  it('awards the player with the best All-In win rate', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 3,
          losses: 1,
          decisions: 4
        }),
        weightEntry({
          user_id: 'u2',
          display_name: 'Bob',
          weight: 'A',
          wins: 1,
          losses: 3,
          decisions: 4
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-whale');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('respects WHALE_MIN_ALLINS — a 1-for-1 player is not crowned', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice' })],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 1,
          losses: 0,
          decisions: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-whale');
  });

  it('breaks ties by higher All-In decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara' }),
        totals({ user_id: 'u2', display_name: 'Alice' })
      ],
      weightAccuracy: [
        // Both 100% win rate; Zara has more decisions → wins the Whale
        weightEntry({
          user_id: 'u1',
          display_name: 'Zara',
          weight: 'A',
          wins: 4,
          losses: 0,
          decisions: 4
        }),
        weightEntry({
          user_id: 'u2',
          display_name: 'Alice',
          weight: 'A',
          wins: 3,
          losses: 0,
          decisions: 3
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-whale');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when nobody meets the minimum-sample guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      weightAccuracy: [
        weightEntry({ weight: 'A', wins: 2, losses: 0, decisions: 2 }),
        weightEntry({ weight: 'L', wins: 10, losses: 0, decisions: 10 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-whale');
  });

  it('is not awarded when the best All-In record in the room is losing — the 2024 case', () => {
    // 2024's holder went 10-12 and was flavored "the house pays this one". The house did
    // not pay. Conviction is negatively predictive here by ~14 points (the room went
    // 50-90 on All-Ins across 2022-25), so the top of a sorted list is usually still a
    // losing record — which is exactly why the badge needs the 50% the world hands it.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Brett' }),
        totals({ user_id: 'u2', display_name: 'Colin' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Brett',
          weight: 'A',
          wins: 10,
          losses: 12,
          decisions: 22
        }),
        weightEntry({
          user_id: 'u2',
          display_name: 'Colin',
          weight: 'A',
          wins: 4,
          losses: 9,
          decisions: 13
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-whale');
  });

  it('is not awarded on an exactly-even All-In record — 50% is the zero, not a win', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice' })],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 4,
          losses: 4,
          decisions: 8
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-whale');
  });

  it('awards the one winning All-In season on record — the 2025 case', () => {
    // Doug 2025 (5-3, .625) is the only winning All-In season across 2022-25. With the
    // bar the badge fires once in four seasons, for the player who actually did it.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Doug' }),
        totals({ user_id: 'u2', display_name: 'Frank' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Doug',
          weight: 'A',
          wins: 5,
          losses: 3,
          decisions: 8
        }),
        // Frank went 8-20 (28.6%) on 28 All-Ins — the worst mark in the room, and the
        // player Big Game Hunter used to crown for the volume alone (#647).
        weightEntry({
          user_id: 'u2',
          display_name: 'Frank',
          weight: 'A',
          wins: 8,
          losses: 20,
          decisions: 28
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'the-whale')).toEqual(['Doug']);
  });

  it('lets The Whale (best) and The Choker (worst) co-hold in the same season', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' })
      ],
      weightAccuracy: [
        weightEntry({
          user_id: 'u1',
          display_name: 'Alice',
          weight: 'A',
          wins: 4,
          losses: 0,
          decisions: 4
        }),
        weightEntry({
          user_id: 'u2',
          display_name: 'Bob',
          weight: 'A',
          wins: 0,
          losses: 4,
          decisions: 4
        })
      ]
    };
    const badges = computeBadges(inputs);
    const whale = badges.find((b) => b.id === 'the-whale');
    const choker = badges.find((b) => b.id === 'the-choker');
    expect(whale?.holders[0].user_id).toBe('u1');
    expect(choker?.holders[0].user_id).toBe('u2');
  });
});

// --- The Ghost ---

describe('The Ghost', () => {
  it('awards the player with the most missed picks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', missed: 5 }),
        totals({ user_id: 'u2', display_name: 'Bob', missed: 2 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-ghost');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when nobody has missed picks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ missed: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-ghost');
  });

  it('breaks ties alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', missed: 3 }),
        totals({ user_id: 'u2', display_name: 'Alice', missed: 3 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-ghost');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });
});

// --- Perfect Week (milestone) ---

describe('Perfect Week', () => {
  it('awards all players who had at least one perfect week', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' }),
        totals({ user_id: 'u3', display_name: 'Carol' })
      ],
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          week_wins: 3,
          week_losses: 0,
          week_missed: 0
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          week_wins: 1,
          week_losses: 2,
          week_missed: 0
        }),
        trend({
          user_id: 'u2',
          display_name: 'Bob',
          week_number: 1,
          week_wins: 2,
          week_losses: 1,
          week_missed: 0
        }),
        trend({
          user_id: 'u3',
          display_name: 'Carol',
          week_number: 1,
          week_wins: 4,
          week_losses: 0,
          week_missed: 0
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'perfect-week');
    expect(badge?.kind).toBe('milestone');
    expect(badge?.holders.map((h) => h.user_id).sort()).toEqual(['u1', 'u3']);
  });

  it('does not count a week with 0 wins as perfect', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      trend: [trend({ week_wins: 0, week_losses: 0, week_missed: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('perfect-week');
  });

  it('does not count a week with a miss as perfect', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      trend: [trend({ week_wins: 3, week_losses: 0, week_missed: 1 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('perfect-week');
  });

  it('deduplicates: a player with two perfect weeks earns the badge once', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      trend: [
        trend({ week_number: 1, week_wins: 3, week_losses: 0, week_missed: 0 }),
        trend({ week_number: 2, week_wins: 2, week_losses: 0, week_missed: 0 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'perfect-week');
    expect(badge?.holders).toHaveLength(1);
  });

  it('is not awarded when there are no trend rows', () => {
    expect(ids(computeBadges(EMPTY))).not.toContain('perfect-week');
  });
});

// --- Awards glossary (modal copy) ---

describe('BADGE_GLOSSARY', () => {
  it('has one entry per BadgeId with non-empty label and description', () => {
    const awardedIds = ids(
      computeBadges({
        ...EMPTY,
        seasonTotals: [totals({ decisions: 10, wins: 7, losses: 3, missed: 1 })]
      })
    );
    // Every id the engine can award must have a glossary entry (and vice versa).
    expect(BADGE_GLOSSARY.length).toBeGreaterThanOrEqual(awardedIds.length);
    for (const g of BADGE_GLOSSARY) {
      expect(g.label.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
      expect(g.emoji.length).toBeGreaterThan(0);
      expect(['title', 'milestone']).toContain(g.kind);
    }
    // No duplicate ids in the glossary.
    expect(new Set(BADGE_GLOSSARY.map((g) => g.id)).size).toBe(BADGE_GLOSSARY.length);
  });

  it('covers every BadgeId exactly once — the catalog and the legend cannot drift', () => {
    // Pinned over the `BadgeId` union rather than a hardcoded count, so #647 shrinking the
    // catalog and #649 growing it again can never disagree about the number. `FLAVORS` is
    // typed `Record<BadgeId, …>`, so TypeScript already guarantees its keys ARE the union;
    // this asserts the glossary enumerates exactly those keys at runtime.
    const flavorIds = BADGE_GLOSSARY.map((g) => g.id).sort();
    const badgeAward = computeBadges({
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10, wins: 7, losses: 3, missed: 1 })]
    });
    for (const b of badgeAward) expect(flavorIds).toContain(b.id);
    expect(new Set(flavorIds).size).toBe(flavorIds.length);
  });

  it('lists every axis end, and every axis end is in the glossary', () => {
    // #635's rule: an axis the engine can award must appear in both, in the same commit.
    // Listing an unearnable badge promises something the engine will never deliver.
    const glossaryIds = new Set(BADGE_GLOSSARY.map((g) => g.id));
    for (const axis of BADGE_AXES) {
      for (const end of axis.ends) expect(glossaryIds.has(end.id)).toBe(true);
    }
  });
});

// --- Integration: badge structure ---

describe('computeBadges — output shape', () => {
  it('returns awarded badges with all required fields', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10, wins: 7, losses: 3, missed: 0 })]
    };
    const badges = computeBadges(inputs);
    for (const b of badges) {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('label');
      expect(b).toHaveProperty('emoji');
      expect(b).toHaveProperty('flavor');
      expect(b).toHaveProperty('description');
      expect(b).toHaveProperty('kind');
      expect(b).toHaveProperty('holders');
      expect(b.holders.length).toBeGreaterThan(0);
    }
  });

  it('title badges have exactly one holder', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10, wins: 7, losses: 3, missed: 0 })]
    };
    const badges = computeBadges(inputs);
    for (const b of badges.filter((b) => b.kind === 'title')) {
      expect(b.holders).toHaveLength(1);
    }
  });
});

// --- Mapper: badgeInputsFromSeasonStats ---
//
// Locks the projection that lets the /stats load reuse already-fetched season rows
// instead of re-querying the five matviews (perf deep-dive). Each badge input must be
// narrowed to exactly the fields the engine needs, with no leftover columns.

describe('badgeInputsFromSeasonStats', () => {
  const seasonStats: SeasonStats = {
    trend: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        season_year: 2024,
        week_number: 1,
        week_points: 5,
        week_wins: 3,
        week_losses: 0,
        week_pushes: 0,
        week_missed: 0,
        is_dropped_week: false,
        cumulative_points: 5,
        season_total: 5,
        cumulative_rank_this_week: 1
      }
    ],
    teamAccuracy: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        season_year: 2024,
        team_id: 7,
        team_name: 'Team Name',
        team_short_name: 'TM',
        decisions: 5,
        wins: 3,
        losses: 2,
        pushes: 0,
        points: 4,
        accuracy: 0.6
      }
    ],
    weightAccuracy: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        season_year: 2024,
        weight: 'A',
        decisions: 3,
        wins: 2,
        losses: 1,
        pushes: 0,
        points: 6,
        accuracy: 2 / 3
      }
    ],
    headToHead: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        opponent_user_id: 'u2',
        opponent_display_name: 'Bob',
        games_compared: 10,
        wins: 7,
        losses: 3,
        pushes: 0,
        points: 14,
        opponent_points: 6
      }
    ],
    consensusStats: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 10,
        mean_consensus_pct: 45.5,
        contrarian_picks: 6,
        contrarian_wins: 4,
        majority_picks: 4,
        majority_wins: 2
      }
    ],
    lineSide: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 10,
        chalk_picks: 7,
        dog_picks: 3
      }
    ],
    streaks: [
      {
        user_id: 'u1',
        display_name: 'Alice',
        graded_picks: 10,
        current_streak: 3,
        max_streak: 5
      }
    ]
  };

  const seasonTotals: SeasonLeaderboardEntry[] = [
    {
      user_id: 'u1',
      display_name: 'Alice',
      avatar_key: null,
      season_year: 2024,
      total_points: 12,
      decisions: 10,
      wins: 6,
      losses: 4,
      pushes: 0,
      missed: 1,
      rank: 1
    }
  ];

  it('projects each input to exactly the badge-engine fields', () => {
    const inputs = badgeInputsFromSeasonStats(seasonStats, seasonTotals);

    expect(inputs.seasonTotals).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 10,
        wins: 6,
        losses: 4,
        pushes: 0,
        missed: 1
      }
    ]);
    expect(inputs.weightAccuracy).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        weight: 'A',
        decisions: 3,
        wins: 2,
        losses: 1,
        pushes: 0
      }
    ]);
    expect(inputs.trend).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        week_number: 1,
        week_wins: 3,
        week_losses: 0,
        week_missed: 0,
        week_points: 5,
        cumulative_rank_this_week: 1
      }
    ]);
    expect(inputs.consensus).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 10,
        mean_consensus_pct: 45.5,
        contrarian_picks: 6,
        contrarian_wins: 4,
        majority_picks: 4,
        majority_wins: 2
      }
    ]);
    expect(inputs.lineSide).toEqual([
      { user_id: 'u1', display_name: 'Alice', decisions: 10, chalk_picks: 7, dog_picks: 3 }
    ]);
  });

  it('drops the inputs no badge reads any more, without touching their season rows', () => {
    // #647 cut The Nemesis, The Homer and Hot Hand, which were the only readers of
    // headToHead / teamAccuracy / streaks. The matviews behind them stay — `/stats`,
    // `/market` and the recap facts builders still read them — so `SeasonStats` keeps
    // carrying them and the projection simply stops forwarding them.
    const inputs = badgeInputsFromSeasonStats(seasonStats, seasonTotals);
    expect(Object.keys(inputs).sort()).toEqual([
      'consensus',
      'lineSide',
      'seasonTotals',
      'trend',
      'weightAccuracy'
    ]);
    expect(seasonStats.headToHead).toHaveLength(1);
    expect(seasonStats.teamAccuracy).toHaveLength(1);
    expect(seasonStats.streaks).toHaveLength(1);
  });

  it('feeds computeBadges so derived badges carry through (equivalence to the old getBadges path)', () => {
    const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals));
    const awarded = ids(badges);
    // trend → perfect-week, totals → the-ghost: proves both sources flow through the mapper.
    expect(awarded).toContain('perfect-week');
    expect(awarded).toContain('the-ghost');
  });

  it('returns empty arrays for empty season stats', () => {
    const inputs = badgeInputsFromSeasonStats(
      {
        trend: [],
        teamAccuracy: [],
        weightAccuracy: [],
        headToHead: [],
        consensusStats: [],
        lineSide: [],
        streaks: []
      },
      []
    );
    expect(inputs).toEqual(EMPTY);
    expect(computeBadges(inputs)).toEqual([]);
  });
});

// --- computeOracleGuard ---

describe('computeOracleGuard', () => {
  it('returns the floor when the list is empty', () => {
    expect(computeOracleGuard([])).toBe(5);
  });

  it('returns the floor for low contrarian activity', () => {
    // avg = 4 contrarian picks → round(4 * 0.35) = 1 → floor wins
    const low = [consensus({ contrarian_picks: 4 }), consensus({ contrarian_picks: 4 })];
    expect(computeOracleGuard(low)).toBe(5);
  });

  it('scales up with high contrarian activity', () => {
    // avg = 30 → round(30 * 0.35) = 11 > 5
    const active = [consensus({ contrarian_picks: 30 }), consensus({ contrarian_picks: 30 })];
    expect(computeOracleGuard(active)).toBe(11);
  });
});

// --- computeLemmingGuard ---

describe('computeLemmingGuard', () => {
  it('returns the floor when the list is empty', () => {
    expect(computeLemmingGuard([])).toBe(5);
  });

  it('scales off majority_picks, not contrarian_picks', () => {
    // The bug this guard exists to fix: The Lemming reused computeOracleGuard, which
    // scales off ~18 contrarian picks/season, and applied it to a ~198-pick majority
    // pool — a guard computed on one measure and applied to another.
    const rows = [
      consensus({ contrarian_picks: 18, majority_picks: 200 }),
      consensus({ contrarian_picks: 18, majority_picks: 200 })
    ];
    expect(computeLemmingGuard(rows)).toBe(70); // round(200 * 0.35)
    expect(computeOracleGuard(rows)).toBe(6); // round(18 * 0.35)
  });
});

// --- Crowd lean axis: Lone Wolf / The Sheep (Tier-B, live since #649) ---
//
// The axis measures FADE RATE — the share of a player's picks taken on the minority side
// — against a zero that is the league mean for that season, with a bar of 5 points. It
// shipped dark (`zero: null`) and on the wrong quantity (`mean_consensus_pct`, the average
// size of the crowd a player sat in rather than how often they broke from it).

describe('Crowd lean axis', () => {
  /** A consensus row expressed as a fade rate: `fade` of `decisions` picks were minority. */
  function fader(name: string, id: string, fade: number, decisions = 250): BadgeConsensusEntry {
    const contrarian = Math.round(fade * decisions);
    return consensus({
      user_id: id,
      display_name: name,
      decisions,
      contrarian_picks: contrarian,
      // Held at a middling rate so this fixture never trips Oracle/Lemming's own bars.
      contrarian_wins: Math.round(contrarian * 0.5),
      majority_picks: decisions - contrarian,
      majority_wins: Math.round((decisions - contrarian) * 0.5)
    });
  }

  function withFaders(rows: BadgeConsensusEntry[]): BadgeInputs {
    return {
      ...EMPTY,
      seasonTotals: rows.map((r) =>
        totals({ user_id: r.user_id, display_name: r.display_name, decisions: r.decisions })
      ),
      consensus: rows
    };
  }

  it('awards both ends when both clear the bar — the 2025 case', () => {
    // League mean 21.0%; Harry +7.1 → Wolf, Colin -6.6 → Sheep.
    const badges = computeBadges(
      withFaders([
        fader('Harry', 'u1', 0.281),
        fader('Colin', 'u2', 0.144),
        fader('Doug', 'u3', 0.21),
        fader('Brett', 'u4', 0.21),
        fader('Michael', 'u5', 0.21),
        fader('Frank', 'u6', 0.21)
      ])
    );
    expect(holderNames(badges, 'lone-wolf')).toEqual(['Harry']);
    expect(holderNames(badges, 'sheep')).toEqual(['Colin']);
  });

  it('awards one end when only that end clears the bar — the 2024 case', () => {
    // League mean 20.3%; Colin +5.4 → Wolf, nobody far enough the other way.
    const badges = computeBadges(
      withFaders([
        fader('Colin', 'u1', 0.257),
        fader('Doug', 'u2', 0.19),
        fader('Brett', 'u3', 0.19),
        fader('Harry', 'u4', 0.19),
        fader('Michael', 'u5', 0.19),
        fader('Frank', 'u6', 0.2)
      ])
    );
    expect(holderNames(badges, 'lone-wolf')).toEqual(['Colin']);
    expect(ids(badges)).not.toContain('sheep');
  });

  it('goes dark when nobody is far enough from the room — the 2022 case', () => {
    // 2022's league mean fade rate was 28.2%, way off the other three seasons' ~21%. The
    // cause is mechanical, not behavioural: that season had five pickers, and with six a
    // 3-3 split makes nobody a minority (`is_minority` is `pct < 0.5`, and 50 is not),
    // while with five every non-unanimous split produces contrarians. Measured against
    // its own room, the 2022 field is unremarkable and the axis correctly goes dark.
    const badges = computeBadges(
      withFaders([
        fader('Brett', 'u1', 0.29),
        fader('Colin', 'u2', 0.285),
        fader('Doug', 'u3', 0.28),
        fader('Frank', 'u4', 0.275),
        fader('Harry', 'u5', 0.28)
      ])
    );
    expect(ids(badges)).not.toContain('lone-wolf');
    expect(ids(badges)).not.toContain('sheep');
  });

  it('recomputes the zero per season — the same player moves with the room', () => {
    // The heart of #649: a hardcoded 21% would have made the whole 2022 five-player field
    // look like wolves for a reason that has nothing to do with 2022. Here one player sits
    // at 28% in both fixtures and is a Wolf only in the room where 28% is unusual.
    const unusual = computeBadges(
      withFaders([
        fader('Wolf', 'u1', 0.28),
        fader('Alice', 'u2', 0.21),
        fader('Bob', 'u3', 0.21),
        fader('Carol', 'u4', 0.21)
      ])
    );
    expect(holderNames(unusual, 'lone-wolf')).toEqual(['Wolf']);

    const ordinary = computeBadges(
      withFaders([
        fader('Wolf', 'u1', 0.28),
        fader('Alice', 'u2', 0.28),
        fader('Bob', 'u3', 0.28),
        fader('Carol', 'u4', 0.28)
      ])
    );
    expect(ids(ordinary)).not.toContain('lone-wolf');
  });

  it('reads fade rate, not the size of the crowd the player sat in', () => {
    // Both players fade identically; only `mean_consensus_pct` — the measure this axis
    // used to read — differs. Neither may be crowned on it.
    const rows = [
      { ...fader('Alice', 'u1', 0.21), mean_consensus_pct: 5 },
      { ...fader('Bob', 'u2', 0.21), mean_consensus_pct: 95 }
    ];
    const awarded = ids(computeBadges(withFaders(rows)));
    expect(awarded).not.toContain('lone-wolf');
    expect(awarded).not.toContain('sheep');
  });

  it('excludes players below the sample guard', () => {
    const rows = [
      fader('Thin', 'u1', 0.9, 2),
      fader('Alice', 'u2', 0.21),
      fader('Bob', 'u3', 0.21)
    ];
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: rows.map((r) =>
        totals({ user_id: r.user_id, display_name: r.display_name, decisions: r.decisions })
      ),
      consensus: rows
    };
    expect(holderNames(computeBadges(inputs), 'lone-wolf')).not.toContain('Thin');
  });

  it('advertises both faces in the glossary, now that both can be earned', () => {
    const glossaryIds = BADGE_GLOSSARY.map((g) => g.id);
    expect(glossaryIds).toContain('lone-wolf');
    expect(glossaryIds).toContain('sheep');
  });

  it('is listed in BADGE_AXES so the awards card can group it', () => {
    const crowd = BADGE_AXES.find((a) => a.measure === 'Crowd lean');
    expect(crowd?.ends.map((e) => e.id)).toEqual(['sheep', 'lone-wolf']);
  });
});

// --- The Oracle (Tier-B) ---

describe('The Oracle', () => {
  it('awards the player with the best contrarian-pick win rate', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      consensus: [
        // Alice: 4/5 = 80% contrarian win rate
        consensus({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 4
        }),
        // Bob: 2/5 = 40% contrarian win rate
        consensus({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 2
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'oracle');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('does not award when no player reaches the oracle guard', () => {
    // oracle guard = max(5, round(avg(contrarian_picks) * 0.35))
    // avg contrarian_picks = 2 → guard = 5; nobody has 5 contrarian picks
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: [consensus({ contrarian_picks: 2, contrarian_wins: 2 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('oracle');
  });

  it('does not award when the best contrarian rate barely beats a coin flip — the 2024 case', () => {
    // 2024's best contrarian rate was 51.1%. A verdict badge whose zero is 50% must be
    // able to say nobody, or it just crowns the top of a sorted list.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Michael', decisions: 250 }),
        totals({ user_id: 'u2', display_name: 'Doug', decisions: 250 })
      ],
      consensus: [
        consensus({
          user_id: 'u1',
          display_name: 'Michael',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 23 // 51.1%
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Doug',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('oracle');
  });

  it('awards when the best contrarian rate clears 55% — the 2025 case', () => {
    // Colin 2025: 62.2% against the crowd. This is the badge doing its job.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Colin', decisions: 250 }),
        totals({ user_id: 'u2', display_name: 'Doug', decisions: 250 })
      ],
      consensus: [
        consensus({
          user_id: 'u1',
          display_name: 'Colin',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 28 // 62.2%
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Doug',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'oracle')).toEqual(['Colin']);
  });

  it('breaks ties by more contrarian picks, then alphabetically', () => {
    // avg contrarian_picks = 10 → guard = max(5, round(10*0.35)) = max(5,4) = 5
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 10 })
      ],
      consensus: [
        // Same rate 60%; Zara has more contrarian picks → wins
        consensus({
          user_id: 'u1',
          display_name: 'Zara',
          decisions: 10,
          contrarian_picks: 10,
          contrarian_wins: 6
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Alice',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 3
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'oracle');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when there is no consensus data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('oracle');
  });
});

// --- The Lemming (Tier-B) ---

describe('The Lemming', () => {
  it('awards the player with the worst majority-pick win rate', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      consensus: [
        // Alice: 4/5 = 80% majority win rate (good)
        consensus({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          majority_picks: 5,
          majority_wins: 4
        }),
        // Bob: 1/5 = 20% majority win rate (worst → Lemming)
        consensus({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          majority_picks: 5,
          majority_wins: 1
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-lemming');
    expect(badge?.holders[0].user_id).toBe('u2');
  });

  it('does not award when no player reaches its guard on majority picks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      // majority_picks = 2 → lemming guard = max(5, round(2*0.35)) = 5; 2 < 5 → ineligible
      consensus: [consensus({ contrarian_picks: 2, majority_picks: 2, majority_wins: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-lemming');
  });

  it('does not award to a player with a winning majority record — the 2024 absurdity', () => {
    // The Lemming 2024 went to Doug on a 52.2% WINNING record, in a season where all six
    // players finished winning: the badge said following the crowd cost him while he was
    // beating the market. He held it three years running; only 2022 survives the bar.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Doug', decisions: 250 }),
        totals({ user_id: 'u2', display_name: 'Colin', decisions: 250 })
      ],
      consensus: [
        consensus({
          user_id: 'u1',
          display_name: 'Doug',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20,
          majority_picks: 205,
          majority_wins: 107 // 52.2%
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Colin',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20,
          majority_picks: 205,
          majority_wins: 115
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-lemming');
  });

  it('awards when the worst majority rate is genuinely under water — the 2025 case', () => {
    // Brett 2025: 42.6% with the crowd, below the 45% bar.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Brett', decisions: 250 }),
        totals({ user_id: 'u2', display_name: 'Colin', decisions: 250 })
      ],
      consensus: [
        consensus({
          user_id: 'u1',
          display_name: 'Brett',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20,
          majority_picks: 205,
          majority_wins: 87 // 42.4%
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Colin',
          decisions: 250,
          contrarian_picks: 45,
          contrarian_wins: 20,
          majority_picks: 205,
          majority_wins: 115
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'the-lemming')).toEqual(['Brett']);
  });

  it('uses a guard scaled off majority_picks, not the Oracle guard on contrarian_picks', () => {
    // A player with a real majority sample but a thin contrarian one used to be judged by
    // the Oracle's guard — computed on ~18 contrarian picks and applied to ~198 majority
    // ones. Here the contrarian-scaled guard (5) would let a 6-pick majority sample count;
    // the majority-scaled guard (round(6 * 0.35) → floor 5) is what must apply.
    const rows = [
      consensus({
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 100,
        contrarian_picks: 94,
        contrarian_wins: 47,
        majority_picks: 6,
        majority_wins: 0
      }),
      consensus({
        user_id: 'u2',
        display_name: 'Bob',
        decisions: 100,
        contrarian_picks: 94,
        contrarian_wins: 47,
        majority_picks: 6,
        majority_wins: 3
      })
    ];
    expect(computeLemmingGuard(rows)).toBe(5);
    expect(holderNames(computeBadges({ ...EMPTY, seasonTotals: [totals({ decisions: 100 }), totals({ user_id: 'u2', display_name: 'Bob', decisions: 100 })], consensus: rows }), 'the-lemming')).toEqual(['Alice']); // prettier-ignore
  });

  it('breaks ties by more majority picks, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 10 })
      ],
      consensus: [
        // Same 0% rate; Zara has more majority picks → wins the Lemming
        consensus({
          user_id: 'u1',
          display_name: 'Zara',
          decisions: 10,
          contrarian_picks: 5,
          majority_picks: 10,
          majority_wins: 0
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Alice',
          decisions: 10,
          contrarian_picks: 5,
          majority_picks: 5,
          majority_wins: 0
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-lemming');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when there is no consensus data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-lemming');
  });
});

// --- Chalk Eater (line-side) ---

describe('Chalk Eater', () => {
  it('awards the player with the highest favorite-pick share', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      lineSide: [
        // Alice: 8/10 favorites; Bob: 4/10 favorites
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 8,
          dog_picks: 2
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          chalk_picks: 4,
          dog_picks: 6
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'chalk-eater');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('uses share, not raw count (fewer picks but higher ratio wins)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 8 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 20 })
      ],
      lineSide: [
        // Alice: 7/8 = 87.5%; Bob: 12/20 = 60% — Alice wins on share despite fewer chalk picks
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 8,
          chalk_picks: 7,
          dog_picks: 1
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 20,
          chalk_picks: 12,
          dog_picks: 8
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'chalk-eater');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('excludes players below the sample guard, and they do not move the zero either', () => {
    // Bob has 2 decisions (below the 5 floor) and a perfect chalk ratio → excluded both
    // from winning and from the league mean the others are measured against. Alice is the
    // room's chalk end among the players who count.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 }),
        totals({ user_id: 'u3', display_name: 'Cara', decisions: 10 }),
        totals({ user_id: 'u4', display_name: 'Dan', decisions: 10 })
      ],
      lineSide: [
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 8,
          dog_picks: 2
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 2,
          chalk_picks: 2,
          dog_picks: 0
        }),
        lineSide({
          user_id: 'u3',
          display_name: 'Cara',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        }),
        lineSide({
          user_id: 'u4',
          display_name: 'Dan',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'chalk-eater')).toEqual(['Alice']);
  });

  it('breaks ties by higher decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 12 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 8 }),
        totals({ user_id: 'u3', display_name: 'Cara', decisions: 10 })
      ],
      lineSide: [
        // Zara and Alice sit at the same +50-point chalk lean, both clear of the bar once
        // Cara pulls the room's zero down; Zara has more decisions → wins. Tie-breaks are
        // unchanged by the league-mean zero.
        lineSide({
          user_id: 'u1',
          display_name: 'Zara',
          decisions: 12,
          chalk_picks: 9,
          dog_picks: 3
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Alice',
          decisions: 8,
          chalk_picks: 6,
          dog_picks: 2
        }),
        lineSide({
          user_id: 'u3',
          display_name: 'Cara',
          decisions: 10,
          chalk_picks: 2,
          dog_picks: 8
        })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'chalk-eater')).toEqual(['Zara']);
  });

  it('is not awarded when there is no line-side data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      lineSide: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('chalk-eater');
  });
});

// --- Dog Lover (line-side) ---

describe('Dog Lover', () => {
  it('awards the player with the highest underdog-pick share', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      lineSide: [
        // Bob backs the dog more often: 9/10 vs Alice 2/10
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 8,
          dog_picks: 2
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          chalk_picks: 1,
          dog_picks: 9
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'dog-lover');
    expect(badge?.holders[0].user_id).toBe('u2');
  });

  it('forms an opposite pair with Chalk Eater on the same axis', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      lineSide: [
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 9,
          dog_picks: 1
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          chalk_picks: 1,
          dog_picks: 9
        })
      ]
    };
    const badges = computeBadges(inputs);
    expect(badges.find((b) => b.id === 'chalk-eater')?.holders[0].user_id).toBe('u1');
    expect(badges.find((b) => b.id === 'dog-lover')?.holders[0].user_id).toBe('u2');
  });

  it('excludes players below the sample guard', () => {
    // Bob is all-dog but on 2 decisions (below the 5 floor) → excluded, leaving Alice as
    // the dog end of a room that otherwise splits evenly.
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 }),
        totals({ user_id: 'u3', display_name: 'Cara', decisions: 10 }),
        totals({ user_id: 'u4', display_name: 'Dan', decisions: 10 })
      ],
      lineSide: [
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 2,
          dog_picks: 8
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 2,
          chalk_picks: 0,
          dog_picks: 2
        }),
        lineSide({
          user_id: 'u3',
          display_name: 'Cara',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        }),
        lineSide({
          user_id: 'u4',
          display_name: 'Dan',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'dog-lover');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when there is no line-side data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      lineSide: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('dog-lover');
  });
});

// --- The line-lean axis itself (#635) ---
//
// The behaviour the axis layer exists for: each end awards independently, so a season can
// produce two titles, one, or none. Before #635 the pair always produced exactly two,
// which is how the app came to crown a Chalk Eater on a 54% favorite share while /stats
// called the same player balanced.

describe('Line lean axis', () => {
  /** Builds a league from [name, chalk, dog] triples on a fixed 100-decision sample. */
  function league(...players: [string, number, number][]): BadgeInputs {
    return {
      ...EMPTY,
      seasonTotals: players.map(([name], i) =>
        totals({ user_id: `u${i + 1}`, display_name: name, decisions: 100 })
      ),
      lineSide: players.map(([name, chalk, dog], i) =>
        lineSide({
          user_id: `u${i + 1}`,
          display_name: name,
          decisions: 100,
          chalk_picks: chalk,
          dog_picks: dog
        })
      )
    };
  }

  it('awards both faces when both ends clear the bar', () => {
    // The layer must not collapse to a single winner per axis.
    const badges = computeBadges(league(['Alice', 70, 30], ['Bob', 30, 70]));
    expect(badges.find((b) => b.id === 'chalk-eater')?.holders[0].display_name).toBe('Alice');
    expect(badges.find((b) => b.id === 'dog-lover')?.holders[0].display_name).toBe('Bob');
  });

  it('awards nothing when nobody is far enough from the room — the 2023 case', () => {
    // A league that leans dog together earns no titles: every player sits within the bar
    // of the league mean, so nobody is "out on an end" of anything.
    const badges = computeBadges(league(['Alice', 44, 56], ['Bob', 42, 58], ['Cara', 46, 54]));
    const awarded = ids(badges);
    expect(awarded).not.toContain('chalk-eater');
    expect(awarded).not.toContain('dog-lover');
    // Nothing glossary-less or holder-less sneaks through in place of the missing titles.
    expect(badges.every((b) => b.holders.length > 0)).toBe(true);
  });

  it('awards one end when only one side clears the bar — the 2025 line-lean case', () => {
    // Real 2025 shape: the league mean gap is -9.4 (dog-side, as it is every year), and
    // Brett is the one player far enough the other way. With the old absolute zero this
    // fixture crowned a Dog Lover instead — the annual gift #649 exists to stop.
    const badges = computeBadges(
      league(['Brett', 54, 46], ['Doug', 40, 60], ['Frank', 42, 58], ['Colin', 44, 56])
    );
    expect(holderNames(badges, 'chalk-eater')).toEqual(['Brett']);
    expect(ids(badges)).not.toContain('dog-lover');
  });

  it('measures against the room, not an even split — the whole league leaning dog awards nobody', () => {
    // The defect in one test. The room is never at an absolute zero because the lines
    // aren't: the league mean gap ran -9.4 / -13.3 / -11.3 / -5.6 across 2025-22, dog-side
    // every year. Against a hardcoded 0 every one of these players clears a 15-point dog
    // lean and Dog Lover fires — measuring the schedule, not the player. Against their own
    // mean they are identical, and the axis correctly says nothing.
    const badges = computeBadges(league(['Alice', 35, 65], ['Bob', 35, 65], ['Cara', 35, 65]));
    expect(ids(badges)).not.toContain('dog-lover');
    expect(ids(badges)).not.toContain('chalk-eater');
  });

  it('deliberately parts company with lineSideTendency, which keeps its absolute zero', () => {
    // #635 had the badge import the /stats tile's threshold so the two could never
    // disagree. #649 breaks that on purpose, because they answer different questions:
    // the tile asks "does this player take dogs or chalk" (absolute, absolute zero), the
    // badge asks "is this player out on an end OF THIS ROOM" (relative, league zero).
    // Here every player is dog-leaning enough that the tile calls them all 'dog', while
    // the badge — correctly — crowns only the one who is unlike the others.
    const players: [string, number, number][] = [
      ['Alice', 30, 70],
      ['Bob', 33, 67],
      ['Cara', 32, 68],
      ['Chalky', 50, 50]
    ];
    const badges = computeBadges(league(...players));
    // The tile would call Chalky balanced; the room makes him its Chalk Eater.
    expect(holderNames(badges, 'chalk-eater')).toEqual(['Chalky']);
    // And nobody is crowned Dog Lover for merely being as dog-leaning as everyone else.
    expect(ids(badges)).not.toContain('dog-lover');
  });

  it('pins the units: the bar is a fraction on both axes, never a percentage', () => {
    // A 20-point gap is 0.20 in the measure's units and clears a 0.15 bar. If either side
    // of the comparison ever slipped into percentage points (20 vs 0.15) every player
    // would clear every bar, and both axes would light both ends every season.
    const badges = computeBadges(league(['Alice', 60, 40], ['Bob', 40, 60]));
    expect(holderNames(badges, 'chalk-eater')).toEqual(['Alice']);
    expect(holderNames(badges, 'dog-lover')).toEqual(['Bob']);

    // Same shape, an order of magnitude smaller: a 2-point gap must clear nothing.
    const flat = computeBadges(league(['Alice', 51, 49], ['Bob', 49, 51]));
    expect(ids(flat)).not.toContain('chalk-eater');
    expect(ids(flat)).not.toContain('dog-lover');
  });
});

// --- Tier-B and Tier-A coexist ---

describe('Tier-B and Tier-A badges coexist', () => {
  it('returns both Tier-A and Tier-B badges in the same output', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10, missed: 0 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10, missed: 4 })
      ],
      consensus: [
        consensus({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          mean_consensus_pct: 40,
          contrarian_picks: 6,
          contrarian_wins: 4
        })
      ]
    };
    const awarded = ids(computeBadges(inputs));
    // Tier-A: the-grinder, on Alice's clean attendance in a season that recorded a miss.
    expect(awarded).toContain('the-grinder');
    // Tier-B: oracle, on this player's contrarian record. (Not lone-wolf — its axis is
    // dark since #635, so a single eligible player no longer wins it by default.)
    expect(awarded).toContain('oracle');
  });
});

// --- The Comeback (#397, season-end) ---

describe('The Comeback', () => {
  it('awards the biggest climb from a low point to the final rank, season complete', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 5
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 1
        }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, cumulative_rank_this_week: 2 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 3, cumulative_rank_this_week: 2 })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'the-comeback');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded mid-season (seasonComplete=false)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 5
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs, false))).not.toContain('the-comeback');
  });

  it('is not awarded when nobody climbed (final rank never beats the low point)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 3
        }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, cumulative_rank_this_week: 2 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, cumulative_rank_this_week: 3 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 3, cumulative_rank_this_week: 4 })
      ]
    };
    expect(ids(computeBadges(inputs, true))).not.toContain('the-comeback');
  });

  it('breaks ties alphabetically by display_name', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Zara',
          week_number: 1,
          cumulative_rank_this_week: 6
        }),
        trend({
          user_id: 'u1',
          display_name: 'Zara',
          week_number: 2,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u2',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 5
        }),
        trend({
          user_id: 'u2',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 1
        })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'the-comeback');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });
});

// --- Week Winner (#397) ---

describe('Week Winner', () => {
  it('awards the player who led weekly scoring in the most weeks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, week_points: 10 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 2, week_points: 5 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, week_points: 15 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 3, week_points: 30 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 3, week_points: 0 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'week-winner');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when two players tie on weeks-led (no sole possession)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 1, week_points: 10 }),
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 2, week_points: 5 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 2, week_points: 25 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('week-winner');
  });

  it('still awards when one player leads weeks-led outright', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 1, week_points: 10 }),
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 2, week_points: 5 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 2, week_points: 25 }),
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 3, week_points: 30 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 3, week_points: 0 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'week-winner');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('credits a tied week to nobody, rather than to whoever sorts first', () => {
    // #634 made a tie on the season-long weeks-led tally resolve to nobody but left the
    // per-week tally underneath calling alphaFirst. A tied week was led by nobody.
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 20 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('week-winner');
  });

  it('lets a player late in the alphabet win a week they tied — the Michael Chestnut case', () => {
    // The live symptom: with alphaFirst per week, Michael Chestnut could never win a tied
    // week — every tie went to the earlier name. Now a tie credits neither, so the tally
    // turns on weeks genuinely led, and Michael takes this one on his outright week 2.
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        // Week 1 tied: counts for neither, where it used to hand Colin a free week.
        trend({ user_id: 'u1', display_name: 'Colin', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Michael', week_number: 1, week_points: 20 }),
        // Week 2 is Michael's outright.
        trend({ user_id: 'u1', display_name: 'Colin', week_number: 2, week_points: 5 }),
        trend({ user_id: 'u2', display_name: 'Michael', week_number: 2, week_points: 25 })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'week-winner')).toEqual(['Michael']);
  });

  it('skips tied weeks in the tally without taking the badge down with them', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 2, week_points: 30 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, week_points: 10 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 3, week_points: 30 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 3, week_points: 10 })
      ]
    };
    expect(holderNames(computeBadges(inputs), 'week-winner')).toEqual(['Alice']);
  });

  it('is not awarded when there are no trend rows', () => {
    expect(ids(computeBadges(EMPTY))).not.toContain('week-winner');
  });
});

// --- Best of the Rest (#397, milestone) ---

describe('Best of the Rest', () => {
  it('awards a player who topped a week while in the bottom half of the standings', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u2',
          display_name: 'Bob',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u3',
          display_name: 'Carol',
          week_number: 1,
          week_points: 20,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u4',
          display_name: 'Dave',
          week_number: 1,
          week_points: 0,
          cumulative_rank_this_week: 4
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'best-of-the-rest');
    expect(badge?.holders.map((h) => h.user_id)).toEqual(['u3']);
  });

  it('is not awarded when the week top scorer is in the top half', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          week_points: 20,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u2',
          display_name: 'Bob',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u3',
          display_name: 'Carol',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u4',
          display_name: 'Dave',
          week_number: 1,
          week_points: 0,
          cumulative_rank_this_week: 4
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('best-of-the-rest');
  });

  it('on a tie for the top score, only the bottom-half player qualifies', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u_top',
          display_name: 'Top',
          week_number: 1,
          week_points: 15,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u_mid1',
          display_name: 'Mid1',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u_mid2',
          display_name: 'Mid2',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u_bottom',
          display_name: 'Bottom',
          week_number: 1,
          week_points: 15,
          cumulative_rank_this_week: 4
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'best-of-the-rest');
    expect(badge?.holders.map((h) => h.user_id)).toEqual(['u_bottom']);
  });

  it('deduplicates a player who qualifies in more than one week', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          week_points: 20,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u2',
          display_name: 'Bob',
          week_number: 1,
          week_points: 5,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          week_points: 25,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u2',
          display_name: 'Bob',
          week_number: 2,
          week_points: 0,
          cumulative_rank_this_week: 1
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'best-of-the-rest');
    expect(badge?.holders).toHaveLength(1);
  });
});

// --- Cardiac (#397, season-end) ---

describe('Cardiac', () => {
  it('awards a player who first reaches sole 1st in the final week', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 4,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 5,
          cumulative_rank_this_week: 1
        }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 3, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 4, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 5, cumulative_rank_this_week: 2 })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'cardiac');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('also awards when sole possession was first taken the week before the finale', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 4,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 5,
          cumulative_rank_this_week: 1
        })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'cardiac');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when the final week is tied at 1st (no sole possession)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 1
        }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, cumulative_rank_this_week: 1 }),
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 2, cumulative_rank_this_week: 1 })
      ]
    };
    expect(ids(computeBadges(inputs, true))).not.toContain('cardiac');
  });

  it('is not awarded when the eventual leader was already leading earlier', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 1
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 4,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 5,
          cumulative_rank_this_week: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs, true))).not.toContain('cardiac');
  });

  it('is not awarded mid-season (seasonComplete=false)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 1,
          cumulative_rank_this_week: 3
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 2,
          cumulative_rank_this_week: 2
        }),
        trend({
          user_id: 'u1',
          display_name: 'Alice',
          week_number: 3,
          cumulative_rank_this_week: 1
        })
      ]
    };
    expect(ids(computeBadges(inputs, false))).not.toContain('cardiac');
  });
});

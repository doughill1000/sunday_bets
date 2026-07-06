import { describe, it, expect } from 'vitest';
import {
  computeBadges,
  computeSampleGuard,
  computeOracleGuard,
  computeHotHandGuard,
  badgeInputsFromSeasonStats,
  BADGE_GLOSSARY
} from '../badges';
import type {
  BadgeConsensusEntry,
  BadgeInputs,
  BadgeLineSideEntry,
  BadgeSeasonTotalsEntry,
  BadgeStreakEntry,
  BadgeWeightEntry,
  BadgeH2HEntry,
  BadgeTeamEntry,
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

function h2h(overrides: Partial<BadgeH2HEntry> = {}): BadgeH2HEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    opponent_user_id: 'u2',
    opponent_display_name: 'Bob',
    games_compared: 10,
    wins: 7,
    losses: 3,
    ...overrides
  };
}

function team(overrides: Partial<BadgeTeamEntry> = {}): BadgeTeamEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    team_id: 1,
    decisions: 5,
    wins: 3,
    losses: 2,
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
  headToHead: [],
  teamAccuracy: [],
  trend: [],
  consensus: [],
  lineSide: [],
  streaks: []
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

function streak(overrides: Partial<BadgeStreakEntry> = {}): BadgeStreakEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    graded_picks: 10,
    current_streak: 3,
    max_streak: 5,
    ...overrides
  };
}

function ids(badges: ReturnType<typeof computeBadges>) {
  return badges.map((b) => b.id);
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
  it('awards the player who placed the most picks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 14 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-grinder');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('ranks by picks placed, not the full slate — the player who missed the most cannot win', () => {
    // Regression for the 2025 prod bug: once a season has missed picks, every
    // player shares the same `decisions` (the full schedule). Ranking on that raw
    // count collapsed the title to an alphabetical tie-break and handed it to the
    // player who actually placed the fewest picks (and missed the most → The Ghost).
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        // Brett: full slate but missed almost all of it → fewest picks placed.
        // Sorts first alphabetically, so he'd win a raw-`decisions` tie-break.
        totals({
          user_id: 'u1',
          display_name: 'Brett',
          decisions: 272,
          wins: 56,
          losses: 82,
          pushes: 1,
          missed: 133
        }),
        // Doug: missed nothing → placed the most picks → the real Grinder.
        totals({
          user_id: 'u2',
          display_name: 'Doug',
          decisions: 271,
          wins: 132,
          losses: 137,
          pushes: 2,
          missed: 0
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-grinder');
    expect(badge?.holders[0].display_name).toBe('Doug');
  });

  it('breaks ties alphabetically by display_name', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 14 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 14 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-grinder');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });

  it('is not awarded when nobody placed a pick (all missed or zero slate)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ decisions: 0, wins: 0, losses: 0, pushes: 0, missed: 0 }),
        totals({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 8,
          wins: 0,
          losses: 0,
          pushes: 0,
          missed: 8
        })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-grinder');
  });
});

// --- The Sharp ---

describe('The Sharp', () => {
  it('awards the player with the best ATS accuracy', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10, wins: 8, losses: 2 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10, wins: 5, losses: 5 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-sharp');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('excludes players below the sample guard', () => {
    // u2 has 2 decisions; guard with avg=6 is max(5, round(6*0.35))=max(5,2)=5 → u2 excluded
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10, wins: 6, losses: 4 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2, wins: 2, losses: 0 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-sharp');
    // Bob has perfect accuracy but is below guard; Alice should win
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when no player reaches the sample guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 2, wins: 2, losses: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-sharp');
  });

  it('breaks ties by higher decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        // All exactly 75% (3 wins / 4 decisions); Zara has the most decisions → wins
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 12, wins: 9, losses: 3 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 8, wins: 6, losses: 2 }),
        totals({ user_id: 'u3', display_name: 'Bob', decisions: 8, wins: 6, losses: 2 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-sharp');
    expect(badge?.holders[0].user_id).toBe('u1');
  });
});

// --- The Choker ---

describe('The Choker', () => {
  it('awards the player with the worst All-In loss rate', () => {
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
    const badge = computeBadges(inputs).find((b) => b.id === 'the-choker');
    expect(badge?.holders[0].user_id).toBe('u2');
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

  it('breaks ties by higher All-In decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara' }),
        totals({ user_id: 'u2', display_name: 'Alice' })
      ],
      weightAccuracy: [
        // Both 0% win rate; Zara has more decisions → wins the Choker
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
          losses: 2,
          decisions: 2
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-choker');
    expect(badge?.holders[0].display_name).toBe('Zara');
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

// --- The Nemesis ---

// `stats_head_to_head` is an upper-triangle half-matrix: each pair appears in exactly
// ONE row, recorded from the smaller-UUID player's perspective (`user_id <
// opponent_user_id`). These fixtures mirror that shape — never both directions.
describe('The Nemesis', () => {
  it('awards the player with the most H2H wins summed across opponents', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' })
      ],
      headToHead: [
        // Single row for the pair; Alice 8-2 over Bob → Bob is implicitly 2-8.
        h2h({
          user_id: 'u1',
          display_name: 'Alice',
          opponent_user_id: 'u2',
          opponent_display_name: 'Bob',
          wins: 8,
          losses: 2
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('sums wins across multiple opponents, crediting both sides of each row', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' }),
        totals({ user_id: 'u3', display_name: 'Carol' })
      ],
      headToHead: [
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u2', opponent_display_name: 'Bob', wins: 6, losses: 4 }), // prettier-ignore
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u3', opponent_display_name: 'Carol', wins: 6, losses: 4 }), // prettier-ignore
        h2h({ user_id: 'u2', display_name: 'Bob', opponent_user_id: 'u3', opponent_display_name: 'Carol', wins: 9, losses: 1 }) // prettier-ignore
      ]
    };
    // Mirrored totals — Alice: 12-8, Bob: 4+9=13-7, Carol: 4+1=5 → Bob is Nemesis.
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].user_id).toBe('u2');
  });

  // Regression (#nemesis-half-matrix): aggregating by `user_id` alone handed the title
  // to whoever owned the smallest UUID, because the upper-triangle view never lists the
  // largest-UUID player as `user_id`. Here Carol (largest UUID) is the true nemesis but
  // never appears as a row's `user_id`; the old code would have crowned Alice.
  it('credits the opponent side so the smallest-UUID player cannot sweep', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' }),
        totals({ user_id: 'u3', display_name: 'Carol' })
      ],
      headToHead: [
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u2', opponent_display_name: 'Bob', wins: 1, losses: 9 }), // prettier-ignore
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u3', opponent_display_name: 'Carol', wins: 1, losses: 9 }), // prettier-ignore
        h2h({ user_id: 'u2', display_name: 'Bob', opponent_user_id: 'u3', opponent_display_name: 'Carol', wins: 1, losses: 9 }) // prettier-ignore
      ]
    };
    // Mirrored totals — Alice: 2-18, Bob: 10-10, Carol: 18-2 → Carol is the Nemesis.
    // Buggy (user_id-only) totals would be Alice 2, Bob 1, Carol 0 → Alice.
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].display_name).toBe('Carol');
  });

  it('is not awarded when there are no H2H entries', () => {
    expect(ids(computeBadges(EMPTY))).not.toContain('the-nemesis');
  });

  it('breaks ties by fewer H2H losses, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara' }),
        totals({ user_id: 'u2', display_name: 'Alice' }),
        totals({ user_id: 'u3', display_name: 'Mike' })
      ],
      headToHead: [
        h2h({ user_id: 'u1', display_name: 'Zara', opponent_user_id: 'u2', opponent_display_name: 'Alice', wins: 5, losses: 5 }), // prettier-ignore
        h2h({ user_id: 'u1', display_name: 'Zara', opponent_user_id: 'u3', opponent_display_name: 'Mike', wins: 5, losses: 0 }), // prettier-ignore
        h2h({ user_id: 'u2', display_name: 'Alice', opponent_user_id: 'u3', opponent_display_name: 'Mike', wins: 5, losses: 3 }) // prettier-ignore
      ]
    };
    // Mirrored totals — Zara: 10-5, Alice: 10-8, Mike: 3-10. Zara and Alice tie on wins;
    // Zara has fewer losses → Zara wins.
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });
});

// --- The Homer ---

describe('The Homer', () => {
  it('awards the player with the highest single-team concentration ratio', () => {
    // Alice: 8/10 = 80% on one team; Bob: 5/10 = 50% on one team
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      teamAccuracy: [
        team({ user_id: 'u1', display_name: 'Alice', team_id: 1, decisions: 8 }),
        team({ user_id: 'u1', display_name: 'Alice', team_id: 2, decisions: 2 }),
        team({ user_id: 'u2', display_name: 'Bob', team_id: 3, decisions: 5 }),
        team({ user_id: 'u2', display_name: 'Bob', team_id: 4, decisions: 5 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-homer');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('excludes players below the sample guard', () => {
    // Only one player but decisions = 2 (below guard of 5)
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 2, wins: 1, losses: 1 })],
      teamAccuracy: [team({ decisions: 2 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-homer');
  });

  it('is not awarded when no eligible player has team data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      teamAccuracy: [] // no team rows at all
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-homer');
  });
});

// --- Big Game Hunter (milestone) ---

describe('Big Game Hunter', () => {
  it('awards all players with 3 or more All-In wins', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' }),
        totals({ user_id: 'u3', display_name: 'Carol' })
      ],
      weightAccuracy: [
        weightEntry({ user_id: 'u1', display_name: 'Alice', weight: 'A', wins: 3, decisions: 4 }),
        weightEntry({ user_id: 'u2', display_name: 'Bob', weight: 'A', wins: 1, decisions: 3 }),
        weightEntry({ user_id: 'u3', display_name: 'Carol', weight: 'A', wins: 4, decisions: 5 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'big-game-hunter');
    expect(badge?.kind).toBe('milestone');
    expect(badge?.holders.map((h) => h.user_id).sort()).toEqual(['u1', 'u3']);
  });

  it('is not awarded when nobody reaches the threshold', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      weightAccuracy: [weightEntry({ weight: 'A', wins: 2, decisions: 5 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('big-game-hunter');
  });

  it('ignores non-All-In weight rows', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals()],
      weightAccuracy: [
        weightEntry({ weight: 'H', wins: 10, decisions: 10 }),
        weightEntry({ weight: 'A', wins: 2, decisions: 3 })
      ]
    };
    expect(ids(computeBadges(inputs))).not.toContain('big-game-hunter');
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
    expect(inputs.headToHead).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        opponent_user_id: 'u2',
        opponent_display_name: 'Bob',
        games_compared: 10,
        wins: 7,
        losses: 3
      }
    ]);
    expect(inputs.teamAccuracy).toEqual([
      { user_id: 'u1', display_name: 'Alice', team_id: 7, decisions: 5, wins: 3, losses: 2 }
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
    expect(inputs.streaks).toEqual([
      { user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 3, max_streak: 5 }
    ]);
  });

  it('feeds computeBadges so derived badges carry through (equivalence to the old getBadges path)', () => {
    const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals));
    const awarded = ids(badges);
    // trend → perfect-week, totals → the-grinder: proves both sources flow through the mapper.
    expect(awarded).toContain('perfect-week');
    expect(awarded).toContain('the-grinder');
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

// --- Lone Wolf (Tier-B) ---

describe('Lone Wolf', () => {
  it('awards the player with the lowest mean consensus_pct', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Alice', decisions: 10, mean_consensus_pct: 35 }),
        consensus({ user_id: 'u2', display_name: 'Bob', decisions: 10, mean_consensus_pct: 65 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'lone-wolf');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('excludes players below the decision sample guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 })
      ],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Alice', decisions: 10, mean_consensus_pct: 50 }),
        // Bob is below the guard (2 decisions < 5 floor)
        consensus({ user_id: 'u2', display_name: 'Bob', decisions: 2, mean_consensus_pct: 20 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'lone-wolf');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when no player reaches the guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 2 })],
      consensus: [consensus({ decisions: 2, mean_consensus_pct: 30 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('lone-wolf');
  });

  it('breaks ties by higher decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 12 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 8 })
      ],
      consensus: [
        // Tied mean; Zara has more decisions → wins
        consensus({ user_id: 'u1', display_name: 'Zara', decisions: 12, mean_consensus_pct: 40 }),
        consensus({ user_id: 'u2', display_name: 'Alice', decisions: 8, mean_consensus_pct: 40 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'lone-wolf');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when there is no consensus data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('lone-wolf');
  });
});

// --- The Sheep (Tier-B) ---

describe('The Sheep', () => {
  it('awards the player with the highest mean consensus_pct', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Alice', decisions: 10, mean_consensus_pct: 75 }),
        consensus({ user_id: 'u2', display_name: 'Bob', decisions: 10, mean_consensus_pct: 55 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'sheep');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('excludes players below the guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 })
      ],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Alice', decisions: 10, mean_consensus_pct: 60 }),
        consensus({ user_id: 'u2', display_name: 'Bob', decisions: 2, mean_consensus_pct: 95 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'sheep');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('breaks ties by higher decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 12 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 8 })
      ],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Zara', decisions: 12, mean_consensus_pct: 70 }),
        consensus({ user_id: 'u2', display_name: 'Alice', decisions: 8, mean_consensus_pct: 70 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'sheep');
    expect(badge?.holders[0].display_name).toBe('Zara');
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

// --- The Fool (Tier-B) ---

describe('The Fool', () => {
  it('awards the player with the worst contrarian-pick win rate', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ],
      consensus: [
        // Alice: 4/5 = 80% contrarian win rate (good → Oracle, not Fool)
        consensus({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 4
        }),
        // Bob: 1/5 = 20% contrarian win rate (worst → Fool)
        consensus({
          user_id: 'u2',
          display_name: 'Bob',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 1
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-fool');
    expect(badge?.holders[0].user_id).toBe('u2');
  });

  it('does not award when no player reaches the oracle guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: [consensus({ contrarian_picks: 2, contrarian_wins: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-fool');
  });

  it('breaks ties by more contrarian picks, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 10 })
      ],
      consensus: [
        // Same 0% rate; Zara has more contrarian picks → wins the Fool
        consensus({
          user_id: 'u1',
          display_name: 'Zara',
          decisions: 10,
          contrarian_picks: 10,
          contrarian_wins: 0
        }),
        consensus({
          user_id: 'u2',
          display_name: 'Alice',
          decisions: 10,
          contrarian_picks: 5,
          contrarian_wins: 0
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-fool');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when there is no consensus data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-fool');
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

  it('does not award when no player reaches the oracle guard on majority picks', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      // majority_picks = 2, oracle guard = max(5, round(avg(contrarian_picks)*0.35))
      // with contrarian_picks=2 → guard=5; majority_picks=2 < 5 → not eligible
      consensus: [consensus({ contrarian_picks: 2, majority_picks: 2, majority_wins: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-lemming');
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

  it('excludes players below the sample guard', () => {
    // u2 has 2 decisions (below the 5 floor) but a perfect chalk ratio → still excluded
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 })
      ],
      lineSide: [
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        }),
        lineSide({ user_id: 'u2', display_name: 'Bob', decisions: 2, chalk_picks: 2, dog_picks: 0 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'chalk-eater');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('breaks ties by higher decision count, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 12 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 8 })
      ],
      lineSide: [
        // Both 50% chalk share; Zara has more decisions → wins
        lineSide({
          user_id: 'u1',
          display_name: 'Zara',
          decisions: 12,
          chalk_picks: 6,
          dog_picks: 6
        }),
        lineSide({
          user_id: 'u2',
          display_name: 'Alice',
          decisions: 8,
          chalk_picks: 4,
          dog_picks: 4
        })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'chalk-eater');
    expect(badge?.holders[0].display_name).toBe('Zara');
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
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 2 })
      ],
      lineSide: [
        lineSide({
          user_id: 'u1',
          display_name: 'Alice',
          decisions: 10,
          chalk_picks: 5,
          dog_picks: 5
        }),
        lineSide({ user_id: 'u2', display_name: 'Bob', decisions: 2, chalk_picks: 0, dog_picks: 2 })
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

// --- Tier-B and Tier-A coexist ---

describe('Tier-B and Tier-A badges coexist', () => {
  it('returns both Tier-A and Tier-B badges in the same output', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 })],
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
    // Tier-A: the-grinder is always awarded when someone has decisions
    expect(awarded).toContain('the-grinder');
    // Tier-B: lone-wolf awarded (single eligible player)
    expect(awarded).toContain('lone-wolf');
  });
});

// --- computeHotHandGuard ---

describe('computeHotHandGuard', () => {
  it('returns the floor when the list is empty', () => {
    expect(computeHotHandGuard([])).toBe(5);
  });

  it('returns the floor for a low-activity season', () => {
    const small = [streak({ graded_picks: 4 }), streak({ graded_picks: 4 })];
    expect(computeHotHandGuard(small)).toBe(5);
  });

  it('scales up with a high-activity season', () => {
    const busy = [streak({ graded_picks: 30 }), streak({ graded_picks: 30 })];
    expect(computeHotHandGuard(busy)).toBe(11);
  });
});

// --- Hot Hand (Tier-C) ---

describe('Hot Hand — provisional (in-season, seasonComplete=false)', () => {
  it('awards the player with the highest current_streak', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 4 }),
        streak({ user_id: 'u2', display_name: 'Bob', graded_picks: 10, current_streak: 2 })
      ]
    };
    const badge = computeBadges(inputs, false).find((b) => b.id === 'hot-hand');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when the best current_streak is 0 (all recent picks are losses/misses)', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 0 }),
        streak({ user_id: 'u2', display_name: 'Bob', graded_picks: 10, current_streak: 0 })
      ]
    };
    expect(ids(computeBadges(inputs, false))).not.toContain('hot-hand');
  });

  it('uses alphabetical tie-break when current_streaks are equal', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({ user_id: 'u2', display_name: 'Bob', graded_picks: 10, current_streak: 3 }),
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 3 })
      ]
    };
    const badge = computeBadges(inputs, false).find((b) => b.id === 'hot-hand');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });

  it('uses graded_picks as secondary tie-break before alpha', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({ user_id: 'u2', display_name: 'Bob', graded_picks: 15, current_streak: 3 }),
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 3 })
      ]
    };
    const badge = computeBadges(inputs, false).find((b) => b.id === 'hot-hand');
    expect(badge?.holders[0].display_name).toBe('Bob');
  });

  it('ignores players below the sample guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        // Only one player; guard = max(5, round(2 * 0.35)) = 5; below guard → no award
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 2, current_streak: 2 })
      ]
    };
    expect(ids(computeBadges(inputs, false))).not.toContain('hot-hand');
  });
});

describe('Hot Hand — crowned (season complete, seasonComplete=true)', () => {
  it('awards the player with the highest max_streak', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({
          user_id: 'u1',
          display_name: 'Alice',
          graded_picks: 10,
          current_streak: 1,
          max_streak: 6
        }),
        streak({
          user_id: 'u2',
          display_name: 'Bob',
          graded_picks: 10,
          current_streak: 4,
          max_streak: 4
        })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'hot-hand');
    // Alice has the longer max_streak even though Bob's current_streak is higher
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when all max_streaks are 0', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, max_streak: 0 })]
    };
    expect(ids(computeBadges(inputs, true))).not.toContain('hot-hand');
  });

  it('uses alphabetical tie-break when max_streaks are equal', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      streaks: [
        streak({ user_id: 'u2', display_name: 'Zara', graded_picks: 10, max_streak: 5 }),
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, max_streak: 5 })
      ]
    };
    const badge = computeBadges(inputs, true).find((b) => b.id === 'hot-hand');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });
});

describe('Hot Hand — no streak data', () => {
  it('is not awarded when streaks array is empty', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 })],
      streaks: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('hot-hand');
  });
});

// --- Tier-C and Tier-A coexist ---

describe('Tier-C and Tier-A badges coexist', () => {
  it('returns Tier-A, Tier-B, and Tier-C badges in the same output', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ user_id: 'u1', display_name: 'Alice', decisions: 10 })],
      consensus: [
        consensus({ user_id: 'u1', display_name: 'Alice', decisions: 10, mean_consensus_pct: 40 })
      ],
      streaks: [
        streak({ user_id: 'u1', display_name: 'Alice', graded_picks: 10, current_streak: 3 })
      ]
    };
    const awarded = ids(computeBadges(inputs));
    expect(awarded).toContain('the-grinder');
    expect(awarded).toContain('lone-wolf');
    expect(awarded).toContain('hot-hand');
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

  it('breaks a tie in weeks-led count alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 1, week_points: 10 }),
        trend({ user_id: 'u1', display_name: 'Zara', week_number: 2, week_points: 5 }),
        trend({ user_id: 'u2', display_name: 'Alice', week_number: 2, week_points: 25 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'week-winner');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });

  it('breaks a within-week points tie alphabetically before tallying', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      trend: [
        trend({ user_id: 'u2', display_name: 'Bob', week_number: 1, week_points: 20 }),
        trend({ user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 20 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'week-winner');
    expect(badge?.holders[0].display_name).toBe('Alice');
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

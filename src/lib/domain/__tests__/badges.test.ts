import { describe, it, expect } from 'vitest';
import {
  computeBadges,
  computeSampleGuard,
  computeOracleGuard,
  badgeInputsFromSeasonStats
} from '../badges';
import type {
  BadgeConsensusEntry,
  BadgeInputs,
  BadgeSeasonTotalsEntry,
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
    ...overrides
  };
}

const EMPTY: BadgeInputs = {
  seasonTotals: [],
  weightAccuracy: [],
  headToHead: [],
  teamAccuracy: [],
  trend: [],
  consensus: []
};

function consensus(overrides: Partial<BadgeConsensusEntry> = {}): BadgeConsensusEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    decisions: 10,
    mean_consensus_pct: 45,
    contrarian_picks: 6,
    contrarian_wins: 4,
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

// --- The Degenerate ---

describe('The Degenerate', () => {
  it('awards the player with the most decisions', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 14 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-degenerate');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('breaks ties alphabetically by display_name', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara', decisions: 14 }),
        totals({ user_id: 'u2', display_name: 'Alice', decisions: 14 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-degenerate');
    expect(badge?.holders[0].display_name).toBe('Alice');
  });

  it('is not awarded when everyone has 0 decisions', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('the-degenerate');
  });
});

// --- Mr. Calculated ---

describe('Mr. Calculated', () => {
  it('awards the player with the best ATS accuracy', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice', decisions: 10, wins: 8, losses: 2 }),
        totals({ user_id: 'u2', display_name: 'Bob', decisions: 10, wins: 5, losses: 5 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'mr-calculated');
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
    const badge = computeBadges(inputs).find((b) => b.id === 'mr-calculated');
    // Bob has perfect accuracy but is below guard; Alice should win
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when no player reaches the sample guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 2, wins: 2, losses: 0 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('mr-calculated');
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
    const badge = computeBadges(inputs).find((b) => b.id === 'mr-calculated');
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

describe('The Nemesis', () => {
  it('awards the player with the most H2H wins summed across opponents', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' })
      ],
      headToHead: [
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u2', wins: 8, losses: 2 }),
        h2h({ user_id: 'u2', display_name: 'Bob', opponent_user_id: 'u1', wins: 2, losses: 8 })
      ]
    };
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('sums wins across multiple opponents', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Alice' }),
        totals({ user_id: 'u2', display_name: 'Bob' }),
        totals({ user_id: 'u3', display_name: 'Carol' })
      ],
      headToHead: [
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u2', wins: 6, losses: 4 }),
        h2h({ user_id: 'u1', display_name: 'Alice', opponent_user_id: 'u3', wins: 6, losses: 4 }),
        h2h({ user_id: 'u2', display_name: 'Bob', opponent_user_id: 'u1', wins: 4, losses: 6 }),
        h2h({ user_id: 'u2', display_name: 'Bob', opponent_user_id: 'u3', wins: 9, losses: 1 }),
        h2h({ user_id: 'u3', display_name: 'Carol', opponent_user_id: 'u1', wins: 4, losses: 6 }),
        h2h({ user_id: 'u3', display_name: 'Carol', opponent_user_id: 'u2', wins: 1, losses: 9 })
      ]
    };
    // Alice: 12 wins; Bob: 13 wins; Carol: 5 wins → Bob is Nemesis
    const badge = computeBadges(inputs).find((b) => b.id === 'the-nemesis');
    expect(badge?.holders[0].user_id).toBe('u2');
  });

  it('is not awarded when there are no H2H entries', () => {
    expect(ids(computeBadges(EMPTY))).not.toContain('the-nemesis');
  });

  it('breaks ties by fewer H2H losses, then alphabetically', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [
        totals({ user_id: 'u1', display_name: 'Zara' }),
        totals({ user_id: 'u2', display_name: 'Alice' })
      ],
      headToHead: [
        // Zara: 7 wins, 2 losses — fewer losses than Alice
        h2h({ user_id: 'u1', display_name: 'Zara', opponent_user_id: 'u2', wins: 7, losses: 2 }),
        h2h({ user_id: 'u2', display_name: 'Alice', opponent_user_id: 'u1', wins: 7, losses: 3 })
      ]
    };
    // Equal wins; Zara has fewer losses → Zara wins
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
        contrarian_wins: 4
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
        week_missed: 0
      }
    ]);
    expect(inputs.consensus).toEqual([
      {
        user_id: 'u1',
        display_name: 'Alice',
        decisions: 10,
        mean_consensus_pct: 45.5,
        contrarian_picks: 6,
        contrarian_wins: 4
      }
    ]);
  });

  it('feeds computeBadges so derived badges carry through (equivalence to the old getBadges path)', () => {
    const badges = computeBadges(badgeInputsFromSeasonStats(seasonStats, seasonTotals));
    const awarded = ids(badges);
    // trend → perfect-week, totals → the-degenerate: proves both sources flow through the mapper.
    expect(awarded).toContain('perfect-week');
    expect(awarded).toContain('the-degenerate');
  });

  it('returns empty arrays for empty season stats', () => {
    const inputs = badgeInputsFromSeasonStats(
      { trend: [], teamAccuracy: [], weightAccuracy: [], headToHead: [], consensusStats: [] },
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

// --- The Contrarian (Tier-B) ---

describe('The Contrarian', () => {
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
    const badge = computeBadges(inputs).find((b) => b.id === 'contrarian');
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
    const badge = computeBadges(inputs).find((b) => b.id === 'contrarian');
    expect(badge?.holders[0].user_id).toBe('u1');
  });

  it('is not awarded when no player reaches the guard', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 2 })],
      consensus: [consensus({ decisions: 2, mean_consensus_pct: 30 })]
    };
    expect(ids(computeBadges(inputs))).not.toContain('contrarian');
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
    const badge = computeBadges(inputs).find((b) => b.id === 'contrarian');
    expect(badge?.holders[0].display_name).toBe('Zara');
  });

  it('is not awarded when there is no consensus data', () => {
    const inputs: BadgeInputs = {
      ...EMPTY,
      seasonTotals: [totals({ decisions: 10 })],
      consensus: []
    };
    expect(ids(computeBadges(inputs))).not.toContain('contrarian');
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
    // Tier-A: the-degenerate is always awarded when someone has decisions
    expect(awarded).toContain('the-degenerate');
    // Tier-B: contrarian awarded (single eligible player)
    expect(awarded).toContain('contrarian');
  });
});

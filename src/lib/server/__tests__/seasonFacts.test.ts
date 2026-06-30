import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildSeasonWrappedFacts,
  toSeasonWrappedSubjects,
  renderSeasonFallback,
  selectRankJourneys,
  selectLeadSummary,
  selectLongestHeater
} from '$lib/server/recap/seasonFacts';
import {
  buildSeasonInputPacket,
  applySeasonAllowlist,
  SEASON_ROASTABLE_FACT_KEYS
} from '$lib/server/recap/voice';
import { loadGroupMeta } from '$lib/server/recap/facts';
import { getSeasonLeaderboard } from '$lib/server/db/queries/leaderboard';
import { getStatsForSeason } from '$lib/server/db/queries/stats';
import { computeBadges } from '$lib/domain/badges';
import type { SeasonLeaderboardEntry } from '$lib/types/leaderboard';
import type { SeasonStats, SeasonTrendEntry, StreakStatsEntry } from '$lib/types/server/stats';
import type { BadgeAward } from '$lib/types/honors';
import type {
  SeasonWrappedSubject,
  PlayerWrappedFacts,
  LeagueWrappedFacts
} from '$lib/types/server/seasonWrapped';

// The builder is DB-bound (it reads the season read-models); mock those so we can drive the
// pure assembly + neutralization deterministically. facts.ts is mocked wholesale so its real
// supabase imports never load — seasonFacts only needs loadGroupMeta from it.
vi.mock('$lib/server/recap/facts', () => ({ loadGroupMeta: vi.fn() }));
vi.mock('$lib/server/db/queries/leaderboard', () => ({ getSeasonLeaderboard: vi.fn() }));
vi.mock('$lib/server/db/queries/stats', () => ({ getStatsForSeason: vi.fn() }));
vi.mock('$lib/domain/badges', () => ({
  computeBadges: vi.fn(),
  badgeInputsFromSeasonStats: vi.fn(() => ({}))
}));

// ── Fixtures ────────────────────────────────────────────────────────────────────

function entry(
  over: Partial<SeasonLeaderboardEntry> & { user_id: string }
): SeasonLeaderboardEntry {
  return {
    display_name: over.display_name ?? over.user_id,
    avatar_key: null,
    season_year: 2024,
    total_points: 0,
    decisions: 10,
    wins: 0,
    losses: 0,
    pushes: 0,
    missed: 0,
    rank: 1,
    ...over
  };
}

function trendRow(over: Partial<SeasonTrendEntry> & { user_id: string }): SeasonTrendEntry {
  return {
    display_name: over.display_name ?? over.user_id,
    season_year: 2024,
    week_number: 1,
    week_points: 0,
    week_wins: 0,
    week_losses: 0,
    week_pushes: 0,
    week_missed: 0,
    cumulative_points: 0,
    season_total: 0,
    cumulative_rank_this_week: 1,
    ...over
  };
}

const SEASON_TOTALS: SeasonLeaderboardEntry[] = [
  {
    ...entry({
      user_id: 'u1',
      display_name: 'Alice',
      rank: 1,
      total_points: 90,
      decisions: 30,
      wins: 18,
      losses: 10,
      pushes: 2
    })
  },
  {
    ...entry({
      user_id: 'u2',
      display_name: 'Bob',
      rank: 2,
      total_points: 75,
      decisions: 30,
      wins: 15,
      losses: 13,
      pushes: 2
    })
  },
  {
    ...entry({
      user_id: 'u3',
      display_name: 'Carol',
      rank: 3,
      total_points: 60,
      decisions: 28,
      wins: 12,
      losses: 14,
      pushes: 2
    })
  }
];

const SEASON_STATS: SeasonStats = {
  trend: [
    trendRow({ user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 10 }),
    trendRow({ user_id: 'u1', display_name: 'Alice', week_number: 2, week_points: 20 }), // best
    trendRow({ user_id: 'u1', display_name: 'Alice', week_number: 3, week_points: 5 }) // worst
  ],
  teamAccuracy: [],
  weightAccuracy: [
    {
      user_id: 'u1',
      display_name: 'Alice',
      season_year: 2024,
      weight: 'A',
      decisions: 4,
      wins: 3,
      losses: 1,
      pushes: 0,
      points: 6,
      accuracy: 0.75
    }
  ],
  headToHead: [
    // Alice loses badly to Bob (margin 4, enough games) → Bob is Alice's nemesis.
    {
      user_id: 'u1',
      display_name: 'Alice',
      opponent_user_id: 'u2',
      opponent_display_name: 'Bob',
      games_compared: 10,
      wins: 2,
      losses: 6,
      pushes: 2,
      points: 20,
      opponent_points: 26
    },
    // Alice beats Carol (not a nemesis — winning record).
    {
      user_id: 'u1',
      display_name: 'Alice',
      opponent_user_id: 'u3',
      opponent_display_name: 'Carol',
      games_compared: 8,
      wins: 5,
      losses: 3,
      pushes: 0,
      points: 25,
      opponent_points: 18
    },
    // A tiny-sample heavy loss that must NOT qualify (below NEMESIS_MIN_GAMES).
    {
      user_id: 'u3',
      display_name: 'Carol',
      opponent_user_id: 'u1',
      opponent_display_name: 'Alice',
      games_compared: 2,
      wins: 0,
      losses: 2,
      pushes: 0,
      points: 2,
      opponent_points: 8
    }
  ],
  consensusStats: [
    {
      user_id: 'u1',
      display_name: 'Alice',
      decisions: 30,
      mean_consensus_pct: 55,
      contrarian_picks: 6,
      contrarian_wins: 4,
      majority_picks: 24,
      majority_wins: 14
    }
  ],
  lineSide: [],
  streaks: []
};

const BADGES: BadgeAward[] = [
  {
    id: 'the-sharp',
    label: 'The Sharp',
    emoji: '🎯',
    flavor: '',
    description: '',
    kind: 'title',
    holders: [{ user_id: 'u1', display_name: 'Alice' }]
  },
  {
    id: 'perfect-week',
    label: 'Perfect Week',
    emoji: '🔥',
    flavor: '',
    description: '',
    kind: 'milestone',
    holders: [{ user_id: 'u2', display_name: 'Bob' }]
  }
];

function setMocks(
  opts: {
    optedOut?: string[];
    totals?: SeasonLeaderboardEntry[];
    stats?: SeasonStats;
    badges?: BadgeAward[];
  } = {}
) {
  vi.mocked(loadGroupMeta).mockResolvedValue({
    name: 'The Gang',
    spice: 'medium',
    aiRecapsEnabled: true,
    optedOutUserIds: opts.optedOut ?? []
  });
  vi.mocked(getSeasonLeaderboard).mockResolvedValue(opts.totals ?? SEASON_TOTALS);
  vi.mocked(getStatsForSeason).mockResolvedValue(opts.stats ?? SEASON_STATS);
  vi.mocked(computeBadges).mockReturnValue(opts.badges ?? BADGES);
}

beforeEach(() => {
  vi.clearAllMocks();
  setMocks();
});

// ── buildSeasonWrappedFacts: happy path ───────────────────────────────────────────

describe('buildSeasonWrappedFacts (happy path)', () => {
  it('assembles one packet per active player plus a league packet', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    expect(facts.group_name).toBe('The Gang');
    expect(facts.season_year).toBe(2024);
    expect(facts.players.map((p) => p.user_id)).toEqual(['u1', 'u2', 'u3']);
  });

  it("derives a player's rank, record, best/worst week, all-in, contrarian and nemesis", async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = facts.players.find((p) => p.user_id === 'u1')!;
    expect(alice.rank).toBe(1);
    expect(alice.total_points).toBe(90);
    expect(alice.record).toEqual({ wins: 18, losses: 10, pushes: 2 });
    expect(alice.best_week).toEqual({ week_number: 2, points: 20 });
    expect(alice.worst_week).toEqual({ week_number: 3, points: 5 });
    expect(alice.allin).toEqual({ wins: 3, losses: 1, pushes: 0 });
    expect(alice.contrarian_wins).toBe(4);
    expect(alice.contrarian_picks).toBe(6);
    expect(alice.nemesis?.opponent.display_name).toBe('Bob');
    expect(alice.nemesis).toMatchObject({ wins: 2, losses: 6, games: 10 });
  });

  it('ignores below-threshold opponents when choosing a nemesis', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    // Carol's only head-to-head row (vs Alice) is a 2-game sample → no nemesis.
    const carol = facts.players.find((p) => p.user_id === 'u3')!;
    expect(carol.nemesis).toBeNull();
  });

  it('attaches each holder’s archetype badges', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = facts.players.find((p) => p.user_id === 'u1')!;
    expect(alice.badges).toEqual([
      { id: 'the-sharp', label: 'The Sharp', emoji: '🎯', kind: 'title' }
    ]);
  });

  it('builds the league packet: champion, wooden spoon, standings, titles, count', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    expect(facts.league.champion).toEqual({ display_name: 'Alice', total_points: 90 });
    expect(facts.league.wooden_spoon).toEqual({ display_name: 'Carol', total_points: 60 });
    expect(facts.league.player_count).toBe(3);
    expect(facts.league.standings).toHaveLength(3);
    expect(facts.league.title_badges).toEqual([
      { label: 'The Sharp', emoji: '🎯', holders: ['Alice'] }
    ]);
  });
});

// ── Opt-out neutralization (third-party references only) ──────────────────────────

describe('buildSeasonWrappedFacts (opt-out neutralization)', () => {
  // Give the opted-out player (Bob) a TITLE badge so holder neutralization is observable
  // in the league packet (title_badges only surfaces 'title'-kind awards).
  const OPTOUT_BADGES: BadgeAward[] = [
    {
      id: 'the-sharp',
      label: 'The Sharp',
      emoji: '🎯',
      flavor: '',
      description: '',
      kind: 'title',
      holders: [{ user_id: 'u2', display_name: 'Bob' }]
    }
  ];
  beforeEach(() => setMocks({ optedOut: ['u2'], badges: OPTOUT_BADGES }));

  it("neutralizes an opted-out player's name in the league packet", async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const bobStanding = facts.league.standings.find((s) => s.user_id === 'u2')!;
    expect(bobStanding.display_name).toBe('a player');
    // The Sharp is held by opted-out Bob → holder neutralized.
    expect(facts.league.title_badges.find((b) => b.label === 'The Sharp')?.holders).toEqual([
      'a player'
    ]);
  });

  it("neutralizes an opted-out opponent in another player's nemesis", async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = facts.players.find((p) => p.user_id === 'u1')!;
    expect(alice.nemesis?.opponent.display_name).toBe('a player');
  });

  it("does NOT neutralize an opted-out player's OWN packet (2nd-person blurb)", async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const bob = facts.players.find((p) => p.user_id === 'u2')!;
    expect(bob.display_name).toBe('Bob');
    expect(bob.opted_out).toBe(true);
  });
});

// ── Empty / incomplete season ─────────────────────────────────────────────────────

describe('buildSeasonWrappedFacts (no participants)', () => {
  it('returns empty players and null honors without throwing', async () => {
    setMocks({
      totals: [],
      stats: { ...SEASON_STATS, trend: [], headToHead: [], weightAccuracy: [], consensusStats: [] },
      badges: []
    });
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    expect(facts.players).toEqual([]);
    expect(facts.league.champion).toBeNull();
    expect(facts.league.wooden_spoon).toBeNull();
    expect(facts.league.player_count).toBe(0);
  });
});

// ── toSeasonWrappedSubjects: shapes ───────────────────────────────────────────────

describe('toSeasonWrappedSubjects', () => {
  it('emits the league subject first, then one per player', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const subjects = toSeasonWrappedSubjects(facts);
    expect(subjects[0]).toMatchObject({ scope: 'league', subject_user_id: null });
    expect(subjects.slice(1).every((s) => s.scope === 'player')).toBe(true);
    expect(subjects.slice(1).map((s) => s.subject_user_id)).toEqual(['u1', 'u2', 'u3']);
    expect(subjects).toHaveLength(4);
  });
});

// ── renderSeasonFallback: deterministic copy ──────────────────────────────────────

function playerSubject(facts: PlayerWrappedFacts): SeasonWrappedSubject {
  return {
    scope: 'player',
    group_name: 'The Gang',
    season_year: 2024,
    spice: 'medium',
    subject_user_id: facts.user_id,
    facts
  };
}
function leagueSubject(facts: LeagueWrappedFacts): SeasonWrappedSubject {
  return {
    scope: 'league',
    group_name: 'The Gang',
    season_year: 2024,
    spice: 'medium',
    subject_user_id: null,
    facts
  };
}

describe('renderSeasonFallback', () => {
  it('player copy names the rank, record, best week, nemesis and badges', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = facts.players.find((p) => p.user_id === 'u1')!;
    const copy = renderSeasonFallback(playerSubject(alice));
    expect(copy).toContain('#1');
    expect(copy).toContain('90');
    expect(copy).toContain('18-10-2');
    expect(copy).toContain('Week 2');
    expect(copy).toContain('Bob'); // nemesis (not opted out in this scenario)
    expect(copy).toContain('The Sharp');
  });

  it('league copy names the champion and player count', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const copy = renderSeasonFallback(leagueSubject(facts.league));
    expect(copy).toContain('The Gang');
    expect(copy).toContain('Alice');
    expect(copy.toLowerCase()).toContain('player');
  });

  it('does not throw on a sparse player packet', () => {
    const sparse: PlayerWrappedFacts = {
      user_id: 'x',
      display_name: 'X',
      rank: 4,
      total_points: 0,
      decisions: 1,
      record: { wins: 0, losses: 1, pushes: 0 },
      best_week: null,
      worst_week: null,
      allin: null,
      contrarian_wins: 0,
      contrarian_picks: 0,
      nemesis: null,
      badges: [],
      best_rank: null,
      longest_streak: 0,
      opted_out: false
    };
    expect(() => renderSeasonFallback(playerSubject(sparse))).not.toThrow();
  });
});

// ── voice: season allowlist + packet (ADR-0008, no PII) ───────────────────────────

describe('applySeasonAllowlist', () => {
  it('strips keys not on the season allowlist', () => {
    const out = applySeasonAllowlist({
      scope: 'player',
      rank: 1,
      email: 'leak@x.com',
      user_id: 'uuid'
    });
    expect(out).toHaveProperty('scope');
    expect(out).toHaveProperty('rank');
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('user_id');
  });

  it('lists the scope and player/league fact slots', () => {
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('nemesis');
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('champion');
    expect(SEASON_ROASTABLE_FACT_KEYS).not.toContain('user_id');
  });
});

describe('buildSeasonInputPacket', () => {
  it('emits player facts with no user_id and the nemesis as a display name only', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = facts.players.find((p) => p.user_id === 'u1')!;
    const packet = buildSeasonInputPacket(playerSubject(alice));
    expect(packet.scope).toBe('player');
    expect((packet.nemesis as { opponent: string }).opponent).toBe('Bob');
    expect(JSON.stringify(packet)).not.toContain('u1');
    expect(JSON.stringify(packet)).not.toContain('u2');
  });

  it('emits league standings as display names + points only (no user_id)', async () => {
    const facts = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const packet = buildSeasonInputPacket(leagueSubject(facts.league));
    expect(packet.scope).toBe('league');
    expect(JSON.stringify(packet.standings)).not.toContain('u1');
  });

  it('sends the full standings table to the prompt (the rank-edge trim was removed)', async () => {
    const base = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    // A 12-player table must now reach the model whole — no top/bottom trim.
    const standings = Array.from({ length: 12 }, (_, i) => ({
      user_id: `p${i + 1}`,
      display_name: `Player ${i + 1}`,
      rank: i + 1,
      total_points: 120 - i * 10
    }));
    const packet = buildSeasonInputPacket(
      leagueSubject({ ...base.league, standings, player_count: standings.length })
    );
    const ranks = (packet.standings as { rank: number }[]).map((s) => s.rank);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('carries the season storyline beats in the league packet', async () => {
    const base = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const packet = buildSeasonInputPacket(leagueSubject(base.league));
    // title_margin = champion (90) − runner-up (75) from SEASON_TOTALS.
    expect(packet.title_margin).toBe(15);
    // Alice led every recorded week → wire-to-wire, no lead changes.
    expect(packet.lead).toMatchObject({ changes: 0, wire_to_wire: true });
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('biggest_climber');
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('lead');
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('title_margin');
  });

  it('carries best_rank and longest_streak in a player packet', async () => {
    const base = await buildSeasonWrappedFacts({ groupId: 'g1', seasonYear: 2024 });
    const alice = base.players.find((p) => p.user_id === 'u1')!;
    const packet = buildSeasonInputPacket(playerSubject(alice));
    expect(packet.best_rank).toBe(1); // Alice's trend rows are all rank 1
    expect(packet.longest_streak).toBe(0); // no streak rows in SEASON_STATS
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('best_rank');
    expect(SEASON_ROASTABLE_FACT_KEYS).toContain('longest_streak');
  });
});

// ── season storyline selectors (pure) ─────────────────────────────────────────────

describe('selectRankJourneys', () => {
  // Carol climbs 4→1 (delta +3); Bob slides 1→3 (delta −2); Alice flat (no journey).
  const trend: SeasonTrendEntry[] = [
    trendRow({
      user_id: 'u3',
      display_name: 'Carol',
      week_number: 1,
      cumulative_rank_this_week: 4
    }),
    trendRow({
      user_id: 'u3',
      display_name: 'Carol',
      week_number: 3,
      cumulative_rank_this_week: 1
    }),
    trendRow({ user_id: 'u2', display_name: 'Bob', week_number: 1, cumulative_rank_this_week: 1 }),
    trendRow({ user_id: 'u2', display_name: 'Bob', week_number: 3, cumulative_rank_this_week: 3 }),
    trendRow({
      user_id: 'u1',
      display_name: 'Alice',
      week_number: 1,
      cumulative_rank_this_week: 2
    }),
    trendRow({ user_id: 'u1', display_name: 'Alice', week_number: 3, cumulative_rank_this_week: 2 })
  ];

  it('picks the biggest climber and biggest faller', () => {
    const { biggest_climber, biggest_faller } = selectRankJourneys(trend, new Set());
    expect(biggest_climber).toEqual({ display_name: 'Carol', from_rank: 4, to_rank: 1, delta: 3 });
    expect(biggest_faller).toEqual({ display_name: 'Bob', from_rank: 1, to_rank: 3, delta: -2 });
  });

  it('neutralizes an opted-out climber', () => {
    const { biggest_climber } = selectRankJourneys(trend, new Set(['u3']));
    expect(biggest_climber?.display_name).toBe('a player');
  });

  it('returns nulls when nobody has a multi-week journey', () => {
    const single = [trendRow({ user_id: 'u1', week_number: 1, cumulative_rank_this_week: 1 })];
    expect(selectRankJourneys(single, new Set())).toEqual({
      biggest_climber: null,
      biggest_faller: null
    });
  });
});

describe('selectLeadSummary', () => {
  it('reports wire-to-wire when one player leads every week', () => {
    const trend = [
      trendRow({
        user_id: 'u1',
        display_name: 'Alice',
        week_number: 1,
        cumulative_rank_this_week: 1
      }),
      trendRow({
        user_id: 'u1',
        display_name: 'Alice',
        week_number: 2,
        cumulative_rank_this_week: 1
      })
    ];
    const out = selectLeadSummary(trend, new Set());
    expect(out).toEqual({
      changes: 0,
      wire_to_wire: true,
      most_weeks_leader: { display_name: 'Alice', weeks: 2 }
    });
  });

  it('counts lead changes and the most-weeks leader', () => {
    const trend = [
      trendRow({
        user_id: 'u1',
        display_name: 'Alice',
        week_number: 1,
        cumulative_rank_this_week: 1
      }),
      trendRow({
        user_id: 'u2',
        display_name: 'Bob',
        week_number: 2,
        cumulative_rank_this_week: 1
      }),
      trendRow({
        user_id: 'u1',
        display_name: 'Alice',
        week_number: 3,
        cumulative_rank_this_week: 1
      })
    ];
    const out = selectLeadSummary(trend, new Set());
    expect(out.changes).toBe(2);
    expect(out.wire_to_wire).toBe(false);
    expect(out.most_weeks_leader).toEqual({ display_name: 'Alice', weeks: 2 });
  });

  it('returns a zero summary for an empty trend', () => {
    expect(selectLeadSummary([], new Set())).toEqual({
      changes: 0,
      wire_to_wire: false,
      most_weeks_leader: null
    });
  });
});

describe('selectLongestHeater', () => {
  const streak = (over: Partial<StreakStatsEntry> & { user_id: string }): StreakStatsEntry => ({
    display_name: over.display_name ?? over.user_id,
    graded_picks: 20,
    current_streak: 0,
    max_streak: 0,
    ...over
  });

  it('returns the longest max_streak above the floor', () => {
    const out = selectLongestHeater(
      [
        streak({ user_id: 'u1', display_name: 'Alice', max_streak: 5 }),
        streak({ user_id: 'u2', display_name: 'Bob', max_streak: 8 })
      ],
      new Set()
    );
    expect(out).toEqual({ display_name: 'Bob', streak: 8 });
  });

  it('returns null when the best streak is below the floor', () => {
    expect(selectLongestHeater([streak({ user_id: 'u1', max_streak: 2 })], new Set())).toBeNull();
  });

  it('neutralizes an opted-out heater', () => {
    const out = selectLongestHeater(
      [streak({ user_id: 'u1', display_name: 'Alice', max_streak: 6 })],
      new Set(['u1'])
    );
    expect(out?.display_name).toBe('a player');
  });
});

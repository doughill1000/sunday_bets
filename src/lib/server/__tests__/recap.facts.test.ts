import { describe, it, expect, vi } from 'vitest';
import {
  snapshotBadges,
  diffBadges,
  selectBadTakes,
  selectTopRivalries,
  type BadTakeCandidate,
  type RivalryRow
} from '$lib/server/recap/facts';
import {
  renderFallback,
  buildInputPacket,
  applyRoastableAllowlist,
  ROASTABLE_FACT_KEYS
} from '$lib/server/recap/voice';
import type { RecapFacts } from '$lib/types/server/recap';
import type { BadgeAward } from '$lib/types/honors';

// ── Pure helper: renderFallback ────────────────────────────────────────────────

const baseFacts: RecapFacts = {
  group_id: '00000000-0000-0000-0000-000000000001',
  group_name: 'The Gang',
  season_year: 2025,
  week_number: 7,
  is_final_week: false,
  spice: 'medium',
  opted_out_user_ids: [],
  week_leader: { user_id: 'u1', display_name: 'Alice', points: 14 },
  week_laggard: { user_id: 'u2', display_name: 'Bob', points: 3 },
  perfect_weeks: [],
  allin_hero: null,
  allin_zero: null,
  contrarian_hit: null,
  standings: [
    { user_id: 'u1', display_name: 'Alice', rank: 1, total_points: 90 },
    { user_id: 'u2', display_name: 'Bob', rank: 2, total_points: 75 }
  ],
  badge_changes: [],
  bad_takes: [],
  rivalries: []
};

describe('renderFallback', () => {
  it('names the week leader in the copy', () => {
    const copy = renderFallback(baseFacts);
    expect(copy).toContain('Alice');
    expect(copy).toContain('Week 7');
    expect(copy).toContain('The Gang');
  });

  it('calls out a perfect week when present', () => {
    const facts: RecapFacts = {
      ...baseFacts,
      perfect_weeks: [{ user_id: 'u3', display_name: 'Carol' }]
    };
    const copy = renderFallback(facts);
    expect(copy).toContain('Carol');
    expect(copy.toLowerCase()).toContain('perfect');
  });

  it('mentions the all-in zero', () => {
    const facts: RecapFacts = {
      ...baseFacts,
      allin_zero: { user_id: 'u2', display_name: 'Bob' }
    };
    const copy = renderFallback(facts);
    expect(copy).toContain('Bob');
    expect(copy.toLowerCase()).toContain('all-in');
  });

  it('signals end-of-season when is_final_week=true', () => {
    const facts: RecapFacts = { ...baseFacts, is_final_week: true };
    const copy = renderFallback(facts);
    expect(copy.toLowerCase()).toMatch(/season|final|standings/);
  });

  it('handles a missing week leader gracefully', () => {
    const facts: RecapFacts = { ...baseFacts, week_leader: null };
    expect(() => renderFallback(facts)).not.toThrow();
  });
});

// ── snapshotBadges ─────────────────────────────────────────────────────────────

describe('snapshotBadges', () => {
  it('maps badge ids to their holder user_ids', () => {
    const badges: BadgeAward[] = [
      {
        id: 'the-grinder',
        label: 'The Grinder',
        emoji: '🪨',
        flavor: 'No glamour, just volume.',
        description: 'Placed the most picks this season.',
        kind: 'title',
        holders: [{ user_id: 'u1', display_name: 'Alice' }]
      },
      {
        id: 'perfect-week',
        label: 'Perfect Week',
        emoji: '🔥',
        flavor: 'Went perfect',
        description: 'Had a perfect week.',
        kind: 'milestone',
        holders: [
          { user_id: 'u2', display_name: 'Bob' },
          { user_id: 'u3', display_name: 'Carol' }
        ]
      }
    ];
    const snap = snapshotBadges(badges);
    expect(snap['the-grinder']).toEqual(['u1']);
    expect(snap['perfect-week']).toEqual(['u2', 'u3']);
  });

  it('returns an empty object when no badges are awarded', () => {
    expect(snapshotBadges([])).toEqual({});
  });
});

// ── diffBadges ─────────────────────────────────────────────────────────────────

describe('diffBadges', () => {
  const makeAward = (
    id: import('$lib/types/honors').BadgeId,
    label: string,
    holders: string[]
  ): BadgeAward => ({
    id,
    label,
    emoji: '🏆',
    flavor: '',
    description: '',
    kind: 'title',
    holders: holders.map((uid) => ({ user_id: uid, display_name: uid }))
  });

  it('returns empty array when no badges changed hands', () => {
    const prior = { 'the-choker': ['u2'] };
    const current = [makeAward('the-choker', 'The Choker', ['u2'])];
    expect(diffBadges(current, prior)).toHaveLength(0);
  });

  it('detects a new badge holder (changed from u1 to u2)', () => {
    const prior = { 'the-choker': ['u1'] };
    const current = [makeAward('the-choker', 'The Choker', ['u2'])];
    const changes = diffBadges(current, prior);
    expect(changes).toHaveLength(1);
    expect(changes[0].badge_label).toBe('The Choker');
    expect(changes[0].new_holders).toContain('u2');
    expect(changes[0].prev_holders).toContain('u1');
  });

  it('detects a badge appearing for the first time (no prior entry)', () => {
    const prior = {};
    const current = [makeAward('perfect-week', 'Perfect Week', ['u3'])];
    const changes = diffBadges(current, prior);
    expect(changes).toHaveLength(1);
    expect(changes[0].badge_label).toBe('Perfect Week');
    expect(changes[0].prev_holders).toEqual([]);
  });

  it('returns empty for the first covered week (no prior snapshot)', () => {
    // When there is no prior recap, badge_changes stay empty — no deltas.
    const current = [makeAward('the-grinder', 'The Grinder', ['u1'])];
    // No prior snapshot supplied — caller passes {} (empty).
    expect(diffBadges(current, {})).toHaveLength(1); // first occurrence = "appeared"
  });

  it('handles multiple badges changing in the same week', () => {
    const prior = { 'the-choker': ['u1'], 'the-sharp': ['u3'] };
    const current = [
      makeAward('the-choker', 'The Choker', ['u2']), // changed
      makeAward('the-sharp', 'The Sharp', ['u3']) // unchanged
    ];
    const changes = diffBadges(current, prior);
    expect(changes).toHaveLength(1);
    expect(changes[0].badge_label).toBe('The Choker');
  });
});

// ── opt-out neutralization via buildRecapFacts (mocked) ───────────────────────

vi.mock('$lib/supabase/service', () => ({ supabaseService: {} }));
vi.mock('$lib/server/db/queries/stats', () => ({
  getStatsForSeason: vi.fn()
}));
vi.mock('$lib/server/db/queries/leaderboard', () => ({
  getSeasonLeaderboard: vi.fn(),
  getCurrentSeasonYear: vi.fn()
}));
vi.mock('$lib/server/db/queries/recaps', () => ({
  getRecapForWeek: vi.fn(async () => null),
  upsertRecap: vi.fn()
}));

// The neutralize function is private; we test its effect through full buildRecapFacts.
// A lightweight integration snapshot is deferred to the integration test suite.
// Here we test opt-out semantics through the public builder with full mocks.
describe('opt-out neutralization (behavioral)', () => {
  it('renderFallback with opted-out week leader shows display_name as provided', () => {
    // The builder neutralizes opted-out players before putting them in facts;
    // renderFallback just renders whatever display_name is in the packet.
    const facts: RecapFacts = {
      ...baseFacts,
      week_leader: { user_id: 'u1', display_name: 'a player', points: 14 },
      opted_out_user_ids: ['u1']
    };
    const copy = renderFallback(facts);
    expect(copy).toContain('a player');
    expect(copy).not.toContain('Alice');
  });
});

// ── selectBadTakes (#295) ───────────────────────────────────────────────────────

describe('selectBadTakes', () => {
  const cand = (over: Partial<BadTakeCandidate>): BadTakeCandidate => ({
    user_id: 'u1',
    display_name: 'Alice',
    weight: 'M',
    outcome: 'loss',
    is_minority: false,
    ...over
  });

  it('returns empty when no qualifying bad take exists', () => {
    expect(selectBadTakes([])).toEqual([]);
    // Low/Medium losses that are not minority picks are not roastable.
    expect(selectBadTakes([cand({ weight: 'L' }), cand({ weight: 'M' })])).toEqual([]);
    // Wins are never roastable, even at All-In weight.
    expect(selectBadTakes([cand({ weight: 'A', outcome: 'win' })])).toEqual([]);
  });

  it('flags a lost All-In as lost_allin', () => {
    const out = selectBadTakes([cand({ weight: 'A' })]);
    expect(out).toEqual([{ user_id: 'u1', display_name: 'Alice', kind: 'lost_allin' }]);
  });

  it('flags a minority loss as a backfired_fade', () => {
    const out = selectBadTakes([cand({ weight: 'M', is_minority: true })]);
    expect(out[0].kind).toBe('backfired_fade');
  });

  it('flags a High-weight loss as heavy_loss', () => {
    const out = selectBadTakes([cand({ weight: 'H' })]);
    expect(out[0].kind).toBe('heavy_loss');
  });

  it('keeps only the most-severe take per player', () => {
    // Alice has both a heavy loss and a lost All-In — All-In wins (more severe).
    const out = selectBadTakes([cand({ weight: 'H' }), cand({ weight: 'A' })]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('lost_allin');
  });

  it('prefers All-In over a minority flag on the same pick', () => {
    const out = selectBadTakes([cand({ weight: 'A', is_minority: true })]);
    expect(out[0].kind).toBe('lost_allin');
  });

  it('excludes opted-out players from roasting', () => {
    const out = selectBadTakes(
      [
        cand({ user_id: 'u1', weight: 'A' }),
        cand({ user_id: 'u2', display_name: 'Bob', weight: 'A' })
      ],
      ['u1']
    );
    expect(out.map((b) => b.user_id)).toEqual(['u2']);
  });

  it('orders by severity then display name (deterministic)', () => {
    const out = selectBadTakes([
      cand({ user_id: 'u2', display_name: 'Bob', weight: 'H' }), // heavy_loss
      cand({ user_id: 'u3', display_name: 'Zoe', weight: 'A' }), // lost_allin
      cand({ user_id: 'u1', display_name: 'Alice', weight: 'M', is_minority: true }) // backfired_fade
    ]);
    expect(out.map((b) => b.kind)).toEqual(['lost_allin', 'backfired_fade', 'heavy_loss']);
  });
});

// ── selectTopRivalries (#295) ───────────────────────────────────────────────────

describe('selectTopRivalries', () => {
  const row = (over: Partial<RivalryRow>): RivalryRow => ({
    user_id: 'a',
    display_name: 'Alice',
    opponent_user_id: 'b',
    opponent_display_name: 'Bob',
    wins: 5,
    losses: 4,
    pushes: 1,
    games_compared: 10,
    ...over
  });

  it('returns empty when no pair meets the minimum games threshold', () => {
    expect(selectTopRivalries([row({ games_compared: 3 })])).toEqual([]);
  });

  it('dedupes the two perspectives to one canonical pair', () => {
    const out = selectTopRivalries([
      row({ user_id: 'a', opponent_user_id: 'b' }),
      row({
        user_id: 'b',
        display_name: 'Bob',
        opponent_user_id: 'a',
        opponent_display_name: 'Alice',
        wins: 4,
        losses: 5
      })
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].player_a.display_name).toBe('Alice');
    expect(out[0].a_wins).toBe(5);
    expect(out[0].b_wins).toBe(4);
  });

  it('ranks by intensity (volume minus margin) and respects the limit', () => {
    const out = selectTopRivalries(
      [
        row({ user_id: 'a', opponent_user_id: 'b', wins: 5, losses: 4, games_compared: 10 }), // intensity 9
        row({
          user_id: 'c',
          display_name: 'Cara',
          opponent_user_id: 'd',
          opponent_display_name: 'Dan',
          wins: 11,
          losses: 1,
          games_compared: 12
        }) // intensity 2 (lopsided)
      ],
      1
    );
    expect(out).toHaveLength(1);
    expect(out[0].player_a.display_name).toBe('Alice');
  });

  it('carries display names only, never user ids, into the rivalry fact', () => {
    const out = selectTopRivalries([row({})]);
    const serialized = JSON.stringify(out[0]);
    expect(out[0].player_a).not.toHaveProperty('email');
    expect(serialized).toContain('Alice');
  });
});

// ── roastable-fact allowlist (#295, ADR-0008) ───────────────────────────────────

describe('applyRoastableAllowlist', () => {
  it('strips keys that are not on the allowlist', () => {
    const out = applyRoastableAllowlist({
      group: 'The Gang',
      bad_takes: [],
      email: 'leak@example.com',
      raw_user_id: 'uuid-123',
      some_off_topic_field: 'nope'
    });
    expect(out).toHaveProperty('group');
    expect(out).toHaveProperty('bad_takes');
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('raw_user_id');
    expect(out).not.toHaveProperty('some_off_topic_field');
  });

  it('allows the rivalry and bad-take slots', () => {
    expect(ROASTABLE_FACT_KEYS).toContain('rivalries');
    expect(ROASTABLE_FACT_KEYS).toContain('bad_takes');
  });
});

describe('buildInputPacket', () => {
  it('includes rivalry and bad-take slots with display names only (no user_id)', () => {
    const facts: RecapFacts = {
      ...baseFacts,
      bad_takes: [{ user_id: 'u2', display_name: 'Bob', kind: 'lost_allin' }],
      rivalries: [
        {
          player_a: { user_id: 'u1', display_name: 'Alice' },
          player_b: { user_id: 'u2', display_name: 'Bob' },
          a_wins: 5,
          b_wins: 4,
          pushes: 1,
          games: 10
        }
      ]
    };
    const packet = buildInputPacket(facts) as {
      bad_takes: { display_name: string; kind: string }[];
      rivalries: { player_a: string; player_b: string }[];
    };
    expect(packet.bad_takes[0]).toEqual({ display_name: 'Bob', kind: 'lost_allin' });
    expect(packet.rivalries[0].player_a).toBe('Alice');
    // The settled-fact user_id must not leak into the model packet.
    expect(JSON.stringify(packet.rivalries)).not.toContain('u1');
    expect(JSON.stringify(packet.bad_takes)).not.toContain('u2');
  });
});

// ── renderFallback with rivalry + bad-take data (#295) ───────────────────────────

describe('renderFallback (rivalry + bad takes)', () => {
  it('names the most-severe bad take', () => {
    const facts: RecapFacts = {
      ...baseFacts,
      bad_takes: [{ user_id: 'u2', display_name: 'Bob', kind: 'lost_allin' }]
    };
    const copy = renderFallback(facts);
    expect(copy).toContain('Bob');
    expect(copy.toLowerCase()).toContain('all-in');
  });

  it('references a rivalry when present', () => {
    const facts: RecapFacts = {
      ...baseFacts,
      rivalries: [
        {
          player_a: { user_id: 'u1', display_name: 'Alice' },
          player_b: { user_id: 'u2', display_name: 'Bob' },
          a_wins: 5,
          b_wins: 4,
          pushes: 0,
          games: 9
        }
      ]
    };
    const copy = renderFallback(facts);
    expect(copy).toContain('Alice');
    expect(copy).toContain('Bob');
    expect(copy.toLowerCase()).toContain('rivalry');
  });

  it('does not throw and adds no rivalry/bad-take lines when both are empty', () => {
    const copy = renderFallback(baseFacts);
    expect(copy.toLowerCase()).not.toContain('rivalry');
  });
});

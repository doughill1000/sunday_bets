import { describe, it, expect, vi } from 'vitest';
import {
  earningStatFor,
  toBadgeFlavorSubject,
  renderBadgeFallback,
  factsFromSubject
} from '$lib/server/recap/badgeFlavorFacts';
import { sanitizeBadgeHolder, buildBadgeFlavorInputPacket } from '$lib/server/recap/voice';
import type { BadgeInputs } from '$lib/domain/badges';
import type { BadgeAward } from '$lib/types/honors';

// badgeFlavorFacts is DB-bound (it reads season read-models); mock those so importing it never
// loads real supabase. The pure functions under test don't touch them. Mirrors seasonFacts.test.
vi.mock('$lib/server/recap/facts', () => ({ loadGroupMeta: vi.fn() }));
vi.mock('$lib/server/db/queries/leaderboard', () => ({ getSeasonLeaderboard: vi.fn() }));
vi.mock('$lib/server/db/queries/stats', () => ({ getStatsForSeason: vi.fn() }));

// ── Fixtures ──────────────────────────────────────────────────────────────────────
function inputs(over: Partial<BadgeInputs> = {}): BadgeInputs {
  return {
    seasonTotals: [],
    weightAccuracy: [],
    trend: [],
    consensus: [],
    lineSide: [],
    ...over
  };
}

function trendRow(
  over: { user_id: string; week_number: number; cumulative_rank_this_week: number } & Partial<
    BadgeInputs['trend'][number]
  >
) {
  return {
    display_name: over.user_id,
    week_wins: 0,
    week_losses: 0,
    week_missed: 0,
    week_points: 0,
    ...over
  } as BadgeInputs['trend'][number];
}

function award(over: Partial<BadgeAward> & { id: BadgeAward['id'] }): BadgeAward {
  return {
    label: 'The Grinder',
    emoji: '🪨',
    flavor: "Can't miss a game. Every slate, every week.",
    description: 'Placed the most picks this season.',
    kind: 'title',
    holders: [{ user_id: 'u1', display_name: 'Marcus' }],
    ...over
  };
}

// ── earningStatFor ──────────────────────────────────────────────────────────────────
describe('earningStatFor', () => {
  it('the-grinder → picks placed = decisions minus missed', () => {
    const i = inputs({
      seasonTotals: [
        {
          user_id: 'u1',
          display_name: 'Marcus',
          decisions: 15,
          wins: 8,
          losses: 4,
          pushes: 0,
          missed: 3
        }
      ]
    });
    expect(earningStatFor('the-grinder', 'u1', i)).toEqual({ picks_placed: 12 });
  });

  it('the-choker vs the-whale read the same All-In row from opposite ends', () => {
    const i = inputs({
      weightAccuracy: [
        {
          user_id: 'u1',
          display_name: 'Marcus',
          weight: 'A',
          decisions: 5,
          wins: 1,
          losses: 4,
          pushes: 0
        }
      ]
    });
    expect(earningStatFor('the-choker', 'u1', i)).toEqual({
      allin_wins: 1,
      allin_losses: 4,
      loss_pct: 80
    });
    expect(earningStatFor('the-whale', 'u1', i)).toEqual({
      allin_wins: 1,
      allin_losses: 4,
      win_pct: 20
    });
  });

  it('oracle → contrarian record + win_pct', () => {
    const i = inputs({
      consensus: [
        {
          user_id: 'u1',
          display_name: 'Marcus',
          decisions: 20,
          mean_consensus_pct: 40,
          contrarian_picks: 8,
          contrarian_wins: 6,
          majority_picks: 12,
          majority_wins: 7
        }
      ]
    });
    expect(earningStatFor('oracle', 'u1', i)).toEqual({
      contrarian_wins: 6,
      contrarian_picks: 8,
      win_pct: 75
    });
  });

  it('chalk-eater → favorite share pct', () => {
    const i = inputs({
      lineSide: [
        { user_id: 'u1', display_name: 'Marcus', decisions: 12, chalk_picks: 9, dog_picks: 3 }
      ]
    });
    expect(earningStatFor('chalk-eater', 'u1', i)).toEqual({ favorite_share_pct: 75 });
  });

  it('lone-wolf / sheep → fade rate, the measure the crowd-lean axis actually reads', () => {
    // #649 moved the axis from `mean_consensus_pct` (the average size of the crowd this
    // player sat in) to fade rate (how often they broke from it). The cited stat has to
    // move with it, or the voice quotes a number the award never looked at.
    const i = inputs({
      consensus: [
        {
          user_id: 'u1',
          display_name: 'Marcus',
          decisions: 20,
          mean_consensus_pct: 40,
          contrarian_picks: 5,
          contrarian_wins: 3,
          majority_picks: 15,
          majority_wins: 8
        }
      ]
    });
    expect(earningStatFor('lone-wolf', 'u1', i)).toEqual({ fade_rate_pct: 25 });
    expect(earningStatFor('sheep', 'u1', i)).toEqual({ fade_rate_pct: 25 });
  });

  it('week-winner → weeks led outright, with tied weeks credited to nobody', () => {
    // Mirrors weeklyTopScorer (#651): a tied week was led by nobody and counts for no one.
    const i = inputs({
      trend: [
        // Week 1 tied at 20 → counts for neither.
        trendRow({ user_id: 'u1', week_number: 1, cumulative_rank_this_week: 1, week_points: 20 }),
        trendRow({ user_id: 'u2', week_number: 1, cumulative_rank_this_week: 1, week_points: 20 }),
        // Week 2 is u1's outright.
        trendRow({ user_id: 'u1', week_number: 2, cumulative_rank_this_week: 1, week_points: 30 }),
        trendRow({ user_id: 'u2', week_number: 2, cumulative_rank_this_week: 2, week_points: 10 })
      ]
    });
    expect(earningStatFor('week-winner', 'u1', i)).toEqual({ weeks_led: 1 });
    expect(earningStatFor('week-winner', 'u2', i)).toEqual({ weeks_led: 0 });
  });

  it('the-comeback → spots climbed from season low to final rank', () => {
    const i = inputs({
      trend: [
        trendRow({ user_id: 'u1', week_number: 1, cumulative_rank_this_week: 5 }),
        trendRow({ user_id: 'u1', week_number: 2, cumulative_rank_this_week: 4 }),
        trendRow({ user_id: 'u1', week_number: 3, cumulative_rank_this_week: 2 })
      ]
    });
    expect(earningStatFor('the-comeback', 'u1', i)).toEqual({
      spots_climbed: 3,
      from_rank: 5,
      to_rank: 2
    });
  });

  it('returns an empty stat when the holder has no matching row', () => {
    expect(earningStatFor('the-grinder', 'ghost', inputs())).toEqual({});
    expect(earningStatFor('the-whale', 'ghost', inputs())).toEqual({});
  });
});

// ── toBadgeFlavorSubject ────────────────────────────────────────────────────────────
describe('toBadgeFlavorSubject', () => {
  const i = inputs({
    seasonTotals: [
      {
        user_id: 'u1',
        display_name: 'Marcus',
        decisions: 15,
        wins: 10,
        losses: 5,
        pushes: 0,
        missed: 0
      }
    ]
  });

  it('names the holder and attaches its earning stat when not opted out', () => {
    const subject = toBadgeFlavorSubject(award({ id: 'the-grinder' }), i, {
      optedOut: new Set(),
      groupName: 'The League',
      seasonYear: 2025,
      spice: 'medium'
    });
    expect(subject.holders).toEqual([
      { display_name: 'Marcus', opted_out: false, stat: { picks_placed: 15 } }
    ]);
    expect(subject.any_opted_out).toBe(false);
    expect(subject.static_flavor).toBe("Can't miss a game. Every slate, every week.");
    expect(subject.badge_id).toBe('the-grinder');
  });

  it('neutralizes an opted-out holder to "a player" and flags it', () => {
    const subject = toBadgeFlavorSubject(award({ id: 'the-grinder' }), i, {
      optedOut: new Set(['u1']),
      groupName: 'The League',
      seasonYear: 2025,
      spice: 'spicy'
    });
    expect(subject.holders[0].display_name).toBe('a player');
    expect(subject.holders[0].opted_out).toBe(true);
    expect(subject.any_opted_out).toBe(true);
  });
});

// ── fallback + persisted facts ──────────────────────────────────────────────────────
describe('renderBadgeFallback / factsFromSubject', () => {
  const subject = toBadgeFlavorSubject(award({ id: 'the-grinder' }), inputs(), {
    optedOut: new Set(),
    groupName: 'The League',
    seasonYear: 2025,
    spice: 'medium'
  });

  it('fallback is the exact static tagline', () => {
    expect(renderBadgeFallback(subject)).toBe("Can't miss a game. Every slate, every week.");
  });

  it('persisted facts carry label/kind/description/holders only', () => {
    expect(factsFromSubject(subject)).toEqual({
      label: 'The Grinder',
      kind: 'title',
      description: 'Placed the most picks this season.',
      holders: subject.holders
    });
  });
});

// ── voice packet (sanitizer + builder) ──────────────────────────────────────────────
describe('sanitizeBadgeHolder', () => {
  it('keeps the name and finite numbers, drops everything else (defense in depth)', () => {
    expect(
      sanitizeBadgeHolder({
        name: 'Marcus',
        wins: 10,
        win_pct: 67,
        user_id: 'a-secret-uuid',
        email: 'marcus@example.com',
        nested: { leak: true },
        bad: Number.NaN
      })
    ).toEqual({ name: 'Marcus', wins: 10, win_pct: 67 });
  });
});

describe('buildBadgeFlavorInputPacket', () => {
  it('packs display names + numeric stats only, never a user_id', () => {
    const subject = toBadgeFlavorSubject(
      award({ id: 'the-grinder' }),
      inputs({
        seasonTotals: [
          {
            user_id: 'u1',
            display_name: 'Marcus',
            decisions: 15,
            wins: 10,
            losses: 5,
            pushes: 0,
            missed: 0
          }
        ]
      }),
      { optedOut: new Set(), groupName: 'The League', seasonYear: 2025, spice: 'medium' }
    );
    const packet = buildBadgeFlavorInputPacket(subject);
    expect(packet).toEqual({
      group: 'The League',
      season: 2025,
      badge: 'The Grinder',
      kind: 'title',
      criteria: 'Placed the most picks this season.',
      holders: [{ name: 'Marcus', picks_placed: 15 }]
    });
    expect(JSON.stringify(packet)).not.toContain('u1');
  });
});

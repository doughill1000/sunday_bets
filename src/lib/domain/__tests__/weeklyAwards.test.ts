import { describe, it, expect } from 'vitest';
import {
  sharpOfWeek,
  donkeyOfWeek,
  badBeatOfWeek,
  contrarianWinOfWeek,
  computeWeeklyHardware,
  computeSeasonShelf,
  WEEKLY_AWARD_ORDER,
  WEEKLY_AWARD_FLAVORS,
  type WeeklyPointsEntry,
  type WeeklyCoverEntry,
  type WeeklyConsensusEntry,
  type WeeklyAwardInputs
} from '../weeklyAwards';

// --- Fixture helpers ---

function pts(overrides: Partial<WeeklyPointsEntry> = {}): WeeklyPointsEntry {
  return { user_id: 'u1', display_name: 'Alice', week_number: 1, week_points: 5, ...overrides };
}

function cover(overrides: Partial<WeeklyCoverEntry> = {}): WeeklyCoverEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    week_number: 1,
    game_id: 'g1',
    outcome: 'loss',
    cover_margin: -1,
    ...overrides
  };
}

function cons(overrides: Partial<WeeklyConsensusEntry> = {}): WeeklyConsensusEntry {
  return {
    user_id: 'u1',
    display_name: 'Alice',
    week_number: 1,
    game_id: 'g1',
    consensus_pct: 25,
    is_minority: true,
    outcome: 'win',
    ...overrides
  };
}

describe('sharpOfWeek', () => {
  it('returns null on an empty week', () => {
    expect(sharpOfWeek([])).toBeNull();
  });

  it('picks the highest week_points', () => {
    const r = sharpOfWeek([
      pts({ user_id: 'a', display_name: 'Al', week_points: 3 }),
      pts({ user_id: 'b', display_name: 'Bo', week_points: 9 }),
      pts({ user_id: 'c', display_name: 'Cy', week_points: 7 })
    ]);
    expect(r).toEqual({ holder: { user_id: 'b', display_name: 'Bo' }, points: 9 });
  });

  it('crowns even a single (negative) player', () => {
    const r = sharpOfWeek([pts({ week_points: -4 })]);
    expect(r?.points).toBe(-4);
  });

  it('breaks ties by display_name then user_id, independent of input order', () => {
    const a = pts({ user_id: 'z', display_name: 'Zoe', week_points: 8 });
    const b = pts({ user_id: 'a', display_name: 'Ada', week_points: 8 });
    const c = pts({ user_id: 'm', display_name: 'Moe', week_points: 8 });
    expect(sharpOfWeek([a, b, c])?.holder.display_name).toBe(
      sharpOfWeek([c, b, a])?.holder.display_name
    );
    // "Ada" < "Moe" < "Zoe" by locale compare.
    expect(sharpOfWeek([a, b, c])?.holder.user_id).toBe('a');
  });
});

describe('donkeyOfWeek', () => {
  it('returns null with fewer than 2 players', () => {
    expect(donkeyOfWeek([pts()])).toBeNull();
  });

  it('returns null when every player scored the same (no spread, no donkey)', () => {
    expect(
      donkeyOfWeek([pts({ user_id: 'a', week_points: 4 }), pts({ user_id: 'b', week_points: 4 })])
    ).toBeNull();
  });

  it('picks the fewest points and is distinct from the sharp', () => {
    const week = [
      pts({ user_id: 'a', display_name: 'Al', week_points: 10 }),
      pts({ user_id: 'b', display_name: 'Bo', week_points: -3 }),
      pts({ user_id: 'c', display_name: 'Cy', week_points: 2 })
    ];
    const donkey = donkeyOfWeek(week);
    const sharp = sharpOfWeek(week);
    expect(donkey).toEqual({ holder: { user_id: 'b', display_name: 'Bo' }, points: -3 });
    expect(donkey?.holder.user_id).not.toBe(sharp?.holder.user_id);
  });

  it('breaks a bottom tie by identity', () => {
    const week = [
      pts({ user_id: 'top', display_name: 'Top', week_points: 9 }),
      pts({ user_id: 'z', display_name: 'Zed', week_points: 1 }),
      pts({ user_id: 'a', display_name: 'Abe', week_points: 1 })
    ];
    expect(donkeyOfWeek(week)?.holder.user_id).toBe('a'); // "Abe" < "Zed"
  });
});

describe('badBeatOfWeek', () => {
  it('returns null when no pick lost', () => {
    expect(
      badBeatOfWeek([
        cover({ outcome: 'win', cover_margin: 3 }),
        cover({ outcome: 'push', cover_margin: 0 })
      ])
    ).toBeNull();
  });

  it('picks the least-negative losing cover margin (closest to covering)', () => {
    const r = badBeatOfWeek([
      cover({ user_id: 'a', display_name: 'Al', cover_margin: -7 }),
      cover({ user_id: 'b', display_name: 'Bo', cover_margin: -0.5 }),
      cover({ user_id: 'c', display_name: 'Cy', cover_margin: -3 })
    ]);
    expect(r).toEqual({ holder: { user_id: 'b', display_name: 'Bo' }, cover_margin: -0.5 });
  });

  it('ignores winning and pushing picks even if their margin is closer to zero', () => {
    const r = badBeatOfWeek([
      cover({ user_id: 'a', display_name: 'Al', outcome: 'win', cover_margin: 0.5 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'loss', cover_margin: -2 })
    ]);
    expect(r?.holder.user_id).toBe('b');
  });

  it('breaks equal-margin ties by identity then game_id, order-independent', () => {
    const a = cover({ user_id: 'b', display_name: 'Bo', game_id: 'g9', cover_margin: -1 });
    const b = cover({ user_id: 'b', display_name: 'Bo', game_id: 'g2', cover_margin: -1 });
    const c = cover({ user_id: 'a', display_name: 'Al', game_id: 'g5', cover_margin: -1 });
    // Al < Bo by name, so 'a' wins regardless of game_id or order.
    expect(badBeatOfWeek([a, b, c])?.holder.user_id).toBe('a');
    expect(badBeatOfWeek([c, b, a])?.holder.user_id).toBe('a');
    // Same player, tie falls to the lower game_id.
    expect(badBeatOfWeek([a, b])?.holder.user_id).toBe('b');
  });
});

describe('contrarianWinOfWeek', () => {
  it('returns null when no minority pick won', () => {
    expect(
      contrarianWinOfWeek([
        cons({ is_minority: false, outcome: 'win' }),
        cons({ is_minority: true, outcome: 'loss' })
      ])
    ).toBeNull();
  });

  it('picks the lowest-consensus minority winner (loneliest)', () => {
    const r = contrarianWinOfWeek([
      cons({ user_id: 'a', display_name: 'Al', consensus_pct: 40 }),
      cons({ user_id: 'b', display_name: 'Bo', consensus_pct: 12.5 }),
      cons({ user_id: 'c', display_name: 'Cy', consensus_pct: 33 })
    ]);
    expect(r).toEqual({ holder: { user_id: 'b', display_name: 'Bo' }, consensus_pct: 12.5 });
  });

  it('breaks equal-consensus ties by identity', () => {
    const r = contrarianWinOfWeek([
      cons({ user_id: 'z', display_name: 'Zoe', consensus_pct: 20 }),
      cons({ user_id: 'a', display_name: 'Abe', consensus_pct: 20 })
    ]);
    expect(r?.holder.user_id).toBe('a');
  });
});

describe('computeWeeklyHardware', () => {
  const inputs: WeeklyAwardInputs = {
    points: [
      // Week 1
      pts({ user_id: 'a', display_name: 'Al', week_number: 1, week_points: 8 }),
      pts({ user_id: 'b', display_name: 'Bo', week_number: 1, week_points: 2 }),
      // Week 2
      pts({ user_id: 'a', display_name: 'Al', week_number: 2, week_points: 1 }),
      pts({ user_id: 'b', display_name: 'Bo', week_number: 2, week_points: 6 })
    ],
    covers: [
      cover({
        user_id: 'b',
        display_name: 'Bo',
        week_number: 1,
        game_id: 'g1',
        cover_margin: -0.5
      }),
      cover({ user_id: 'a', display_name: 'Al', week_number: 2, game_id: 'g9', cover_margin: -4 })
    ],
    consensus: [
      cons({ user_id: 'a', display_name: 'Al', week_number: 1, consensus_pct: 20 }),
      cons({ user_id: 'b', display_name: 'Bo', week_number: 2, consensus_pct: 10 })
    ]
  };

  it('mints one entry per week that has awards, newest week first', () => {
    const hw = computeWeeklyHardware(inputs);
    expect(hw.map((w) => w.week_number)).toEqual([2, 1]);
  });

  it('orders each week’s awards by WEEKLY_AWARD_ORDER', () => {
    const week1 = computeWeeklyHardware(inputs).find((w) => w.week_number === 1)!;
    expect(week1.awards.map((a) => a.id)).toEqual([
      'sharp-of-week',
      'donkey-of-week',
      'bad-beat',
      'contrarian-win'
    ]);
    // Week 1: Al top (sharp), Bo bottom (donkey), Bo bad beat, Al contrarian.
    const byId = Object.fromEntries(week1.awards.map((a) => [a.id, a.holder.user_id]));
    expect(byId).toEqual({
      'sharp-of-week': 'a',
      'donkey-of-week': 'b',
      'bad-beat': 'b',
      'contrarian-win': 'a'
    });
  });

  it('omits weeks with no awards', () => {
    const hw = computeWeeklyHardware({ points: [], covers: [], consensus: [] });
    expect(hw).toEqual([]);
  });

  it('only surfaces awards for weeks present in the inputs (non-scoring weeks are absent)', () => {
    // Inputs carry only weeks 1 and 2; a non-scoring week 99 never appears because its
    // source matviews filter is_scoring and so contribute no rows here.
    const weeks = computeWeeklyHardware(inputs).map((w) => w.week_number);
    expect(weeks).not.toContain(99);
  });
});

describe('computeSeasonShelf', () => {
  it('tallies each award per player and lists them most-decorated first', () => {
    const inputs: WeeklyAwardInputs = {
      points: [
        // Al sharp in weeks 1,2,3; Bo donkey each week.
        pts({ user_id: 'a', display_name: 'Al', week_number: 1, week_points: 9 }),
        pts({ user_id: 'b', display_name: 'Bo', week_number: 1, week_points: 1 }),
        pts({ user_id: 'a', display_name: 'Al', week_number: 2, week_points: 9 }),
        pts({ user_id: 'b', display_name: 'Bo', week_number: 2, week_points: 1 }),
        pts({ user_id: 'a', display_name: 'Al', week_number: 3, week_points: 9 }),
        pts({ user_id: 'b', display_name: 'Bo', week_number: 3, week_points: 1 })
      ],
      covers: [],
      consensus: []
    };
    const shelf = computeSeasonShelf(computeWeeklyHardware(inputs));
    expect(shelf).toHaveLength(2);
    // Both have 3 awards; tie broken alphabetically (Al before Bo).
    expect(shelf.map((e) => e.user_id)).toEqual(['a', 'b']);

    const al = shelf.find((e) => e.user_id === 'a')!;
    expect(al.total).toBe(3);
    expect(al.awards).toEqual([{ id: 'sharp-of-week', short: 'Sharp', emoji: '🎯', count: 3 }]);

    const bo = shelf.find((e) => e.user_id === 'b')!;
    expect(bo.awards).toEqual([{ id: 'donkey-of-week', short: 'Donkey', emoji: '🫏', count: 3 }]);
  });

  it('orders a player’s awards by WEEKLY_AWARD_ORDER and drops zero counts', () => {
    const inputs: WeeklyAwardInputs = {
      points: [pts({ user_id: 'a', display_name: 'Al', week_number: 1, week_points: 5 })],
      covers: [cover({ user_id: 'a', display_name: 'Al', week_number: 1, cover_margin: -2 })],
      consensus: [cons({ user_id: 'a', display_name: 'Al', week_number: 1, consensus_pct: 30 })]
    };
    const shelf = computeSeasonShelf(computeWeeklyHardware(inputs));
    // Single player: sharp (only one, no donkey), bad beat, contrarian win — donkey absent.
    expect(shelf[0].awards.map((a) => a.id)).toEqual([
      'sharp-of-week',
      'bad-beat',
      'contrarian-win'
    ]);
    expect(shelf[0].total).toBe(3);
  });

  it('returns an empty shelf when no hardware was minted', () => {
    expect(computeSeasonShelf([])).toEqual([]);
  });
});

describe('flavor metadata', () => {
  it('has a flavor entry for every award id, in canonical order', () => {
    expect(WEEKLY_AWARD_ORDER).toEqual([
      'sharp-of-week',
      'donkey-of-week',
      'bad-beat',
      'contrarian-win'
    ]);
    for (const id of WEEKLY_AWARD_ORDER) {
      const f = WEEKLY_AWARD_FLAVORS[id];
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.short.length).toBeGreaterThan(0);
      expect(f.emoji.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
});

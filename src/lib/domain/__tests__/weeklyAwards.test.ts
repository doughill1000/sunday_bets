import { describe, it, expect } from 'vitest';
import {
  gameBallOfWeek,
  donkeyOfWeek,
  badBeatOfWeek,
  backdoorOfWeek,
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

describe('gameBallOfWeek', () => {
  it('returns null on an empty week', () => {
    expect(gameBallOfWeek([])).toBeNull();
  });

  it('picks the highest week_points', () => {
    const r = gameBallOfWeek([
      pts({ user_id: 'a', display_name: 'Al', week_points: 3 }),
      pts({ user_id: 'b', display_name: 'Bo', week_points: 9 }),
      pts({ user_id: 'c', display_name: 'Cy', week_points: 7 })
    ]);
    expect(r).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], points: 9 });
  });

  it('crowns even a single (negative) player', () => {
    const r = gameBallOfWeek([pts({ week_points: -4 })]);
    expect(r?.points).toBe(-4);
  });

  it('mints every player tied on the week high as a co-winner, in identity order (#770)', () => {
    const a = pts({ user_id: 'z', display_name: 'Zoe', week_points: 8 });
    const b = pts({ user_id: 'a', display_name: 'Ada', week_points: 8 });
    const c = pts({ user_id: 'm', display_name: 'Moe', week_points: 5 });
    // "Ada" < "Zoe" by locale compare; Moe is off the high and wins nothing.
    expect(gameBallOfWeek([a, b, c])).toEqual({
      holders: [
        { user_id: 'a', display_name: 'Ada' },
        { user_id: 'z', display_name: 'Zoe' }
      ],
      points: 8
    });
    // Order-independent.
    expect(gameBallOfWeek([c, b, a])).toEqual(gameBallOfWeek([a, b, c]));
  });

  it('crowns everyone in a flat week — it is still "most points" (#770)', () => {
    const flat = [
      pts({ user_id: 'a', display_name: 'Al', week_points: 4 }),
      pts({ user_id: 'b', display_name: 'Bo', week_points: 4 }),
      pts({ user_id: 'c', display_name: 'Cy', week_points: 4 })
    ];
    expect(gameBallOfWeek(flat)?.holders.map((h) => h.user_id)).toEqual(['a', 'b', 'c']);
    // …while the Donkey side deliberately mints nobody.
    expect(donkeyOfWeek(flat)).toBeNull();
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

  it('picks the fewest points and is distinct from the game ball', () => {
    const week = [
      pts({ user_id: 'a', display_name: 'Al', week_points: 10 }),
      pts({ user_id: 'b', display_name: 'Bo', week_points: -3 }),
      pts({ user_id: 'c', display_name: 'Cy', week_points: 2 })
    ];
    const donkey = donkeyOfWeek(week);
    const gameBall = gameBallOfWeek(week);
    expect(donkey).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], points: -3 });
    expect(donkey?.holders[0].user_id).not.toBe(gameBall?.holders[0].user_id);
  });

  it('shares the bottom between everyone tied there, in identity order (#770)', () => {
    const week = [
      pts({ user_id: 'top', display_name: 'Top', week_points: 9 }),
      pts({ user_id: 'z', display_name: 'Zed', week_points: 1 }),
      pts({ user_id: 'a', display_name: 'Abe', week_points: 1 })
    ];
    // "Abe" < "Zed" by locale compare.
    expect(donkeyOfWeek(week)?.holders.map((h) => h.user_id)).toEqual(['a', 'z']);
    expect(donkeyOfWeek([...week].reverse())).toEqual(donkeyOfWeek(week));
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
    expect(r).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], cover_margin: -0.5 });
  });

  it('ignores winning and pushing picks even if their margin is closer to zero', () => {
    const r = badBeatOfWeek([
      cover({ user_id: 'a', display_name: 'Al', outcome: 'win', cover_margin: 0.5 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'loss', cover_margin: -2 })
    ]);
    expect(r?.holders.map((h) => h.user_id)).toEqual(['b']);
  });

  it('mints every equal-margin beat as a co-winner, identity-ordered and order-independent (#770)', () => {
    const a = cover({ user_id: 'b', display_name: 'Bo', game_id: 'g9', cover_margin: -1 });
    const b = cover({ user_id: 'a', display_name: 'Al', game_id: 'g5', cover_margin: -1 });
    const c = cover({ user_id: 'c', display_name: 'Cy', game_id: 'g1', cover_margin: -6 });
    // Al < Bo by name; Cy's wider beat loses outright.
    expect(badBeatOfWeek([a, b, c])?.holders.map((h) => h.user_id)).toEqual(['a', 'b']);
    expect(badBeatOfWeek([c, b, a])).toEqual(badBeatOfWeek([a, b, c]));
  });

  it('counts a player tied with themselves across two picks once (#770)', () => {
    const a = cover({ user_id: 'b', display_name: 'Bo', game_id: 'g9', cover_margin: -1 });
    const b = cover({ user_id: 'b', display_name: 'Bo', game_id: 'g2', cover_margin: -1 });
    expect(badBeatOfWeek([a, b])?.holders).toEqual([{ user_id: 'b', display_name: 'Bo' }]);
  });
});

describe('backdoorOfWeek', () => {
  it('returns null when no pick won', () => {
    expect(
      backdoorOfWeek([
        cover({ outcome: 'loss', cover_margin: -3 }),
        cover({ outcome: 'push', cover_margin: 0 })
      ])
    ).toBeNull();
  });

  it('awards the player whose win covered by the smallest margin', () => {
    const r = backdoorOfWeek([
      cover({ user_id: 'a', display_name: 'Al', outcome: 'win', cover_margin: 7 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'win', cover_margin: 0.5 }),
      cover({ user_id: 'c', display_name: 'Cy', outcome: 'win', cover_margin: 3 })
    ]);
    expect(r).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], cover_margin: 0.5 });
  });

  it('ignores losing and pushing picks even if their margin is closer to zero', () => {
    const r = backdoorOfWeek([
      cover({ user_id: 'a', display_name: 'Al', outcome: 'loss', cover_margin: -0.5 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'win', cover_margin: 2 })
    ]);
    expect(r?.holders.map((h) => h.user_id)).toEqual(['b']);
  });

  it('still crowns the least-wide win when every win was comfortable (no separate threshold)', () => {
    // Mirrors Bad Beat exactly: null means "nobody won", not "nobody won narrowly" — Bad Beat
    // has no configurable "how bad is a bad beat" cutoff either, it just takes the best of
    // whatever losses exist. A blowout-only week still crowns the least-blowout win.
    const r = backdoorOfWeek([
      cover({ user_id: 'a', display_name: 'Al', outcome: 'win', cover_margin: 21 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'win', cover_margin: 14 })
    ]);
    expect(r).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], cover_margin: 14 });
  });

  it('mints every equal-margin cover as a co-winner, deduping one player’s two picks (#770)', () => {
    const a = cover({
      user_id: 'b',
      display_name: 'Bo',
      game_id: 'g9',
      outcome: 'win',
      cover_margin: 1
    });
    const b = cover({
      user_id: 'b',
      display_name: 'Bo',
      game_id: 'g2',
      outcome: 'win',
      cover_margin: 1
    });
    const c = cover({
      user_id: 'a',
      display_name: 'Al',
      game_id: 'g5',
      outcome: 'win',
      cover_margin: 1
    });
    // Al < Bo by name; Bo's two tied picks collapse to one holder.
    expect(backdoorOfWeek([a, b, c])?.holders).toEqual([
      { user_id: 'a', display_name: 'Al' },
      { user_id: 'b', display_name: 'Bo' }
    ]);
    expect(backdoorOfWeek([c, b, a])).toEqual(backdoorOfWeek([a, b, c]));
    expect(backdoorOfWeek([a, b])?.holders).toEqual([{ user_id: 'b', display_name: 'Bo' }]);
  });

  it('fires alongside Bad Beat in the same week without interfering', () => {
    const covers = [
      cover({ user_id: 'a', display_name: 'Al', outcome: 'loss', cover_margin: -0.5 }),
      cover({ user_id: 'b', display_name: 'Bo', outcome: 'win', cover_margin: 0.5 })
    ];
    const badBeat = badBeatOfWeek(covers);
    const backdoor = backdoorOfWeek(covers);
    expect(badBeat).toEqual({
      holders: [{ user_id: 'a', display_name: 'Al' }],
      cover_margin: -0.5
    });
    expect(backdoor).toEqual({
      holders: [{ user_id: 'b', display_name: 'Bo' }],
      cover_margin: 0.5
    });
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
    expect(r).toEqual({ holders: [{ user_id: 'b', display_name: 'Bo' }], consensus_pct: 12.5 });
  });

  it('mints every equal-consensus lone winner as a co-winner (#770)', () => {
    const rows = [
      cons({ user_id: 'z', display_name: 'Zoe', game_id: 'g1', consensus_pct: 20 }),
      cons({ user_id: 'a', display_name: 'Abe', game_id: 'g2', consensus_pct: 20 }),
      cons({ user_id: 'm', display_name: 'Moe', game_id: 'g3', consensus_pct: 40 })
    ];
    expect(contrarianWinOfWeek(rows)?.holders.map((h) => h.user_id)).toEqual(['a', 'z']);
    expect(contrarianWinOfWeek([...rows].reverse())).toEqual(contrarianWinOfWeek(rows));
  });

  it('counts a player tied with themselves across two lone picks once (#770)', () => {
    const r = contrarianWinOfWeek([
      cons({ user_id: 'a', display_name: 'Abe', game_id: 'g1', consensus_pct: 20 }),
      cons({ user_id: 'a', display_name: 'Abe', game_id: 'g2', consensus_pct: 20 })
    ]);
    expect(r?.holders).toEqual([{ user_id: 'a', display_name: 'Abe' }]);
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
      cover({
        user_id: 'a',
        display_name: 'Al',
        week_number: 1,
        game_id: 'g2',
        outcome: 'win',
        cover_margin: 2
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
      'game-ball',
      'donkey-of-week',
      'bad-beat',
      'backdoor',
      'contrarian-win'
    ]);
    // Week 1: Al top (game ball), Bo bottom (donkey), Bo bad beat, Al backdoor, Al contrarian.
    const byId = Object.fromEntries(
      week1.awards.map((a) => [a.id, a.holders.map((h) => h.user_id)])
    );
    expect(byId).toEqual({
      'game-ball': ['a'],
      'donkey-of-week': ['b'],
      'bad-beat': ['b'],
      backdoor: ['a'],
      'contrarian-win': ['a']
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
        // Al game ball in weeks 1,2,3; Bo donkey each week.
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
    expect(al.awards).toEqual([{ id: 'game-ball', short: 'Game Ball', emoji: '🏈', count: 3 }]);

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
    // Single player: game ball (only one, no donkey), bad beat, contrarian win — donkey absent.
    expect(shelf[0].awards.map((a) => a.id)).toEqual(['game-ball', 'bad-beat', 'contrarian-win']);
    expect(shelf[0].total).toBe(3);
  });

  it('gives every co-winner a full award, never a fraction (#770)', () => {
    const inputs: WeeklyAwardInputs = {
      points: [
        // Week 1: Al and Bo tie the high at 9, Cy is the lone donkey.
        pts({ user_id: 'a', display_name: 'Al', week_number: 1, week_points: 9 }),
        pts({ user_id: 'b', display_name: 'Bo', week_number: 1, week_points: 9 }),
        pts({ user_id: 'c', display_name: 'Cy', week_number: 1, week_points: 2 })
      ],
      covers: [],
      consensus: []
    };
    const hardware = computeWeeklyHardware(inputs);
    const gameBall = hardware[0].awards.find((a) => a.id === 'game-ball')!;
    expect(gameBall.holders.map((h) => h.user_id)).toEqual(['a', 'b']);

    const shelf = computeSeasonShelf(hardware);
    const counts = Object.fromEntries(shelf.map((e) => [e.user_id, e.total]));
    // Both co-winners bank one whole Game Ball; Cy banks the Donkey.
    expect(counts).toEqual({ a: 1, b: 1, c: 1 });
    for (const id of ['a', 'b']) {
      expect(shelf.find((e) => e.user_id === id)!.awards).toEqual([
        { id: 'game-ball', short: 'Game Ball', emoji: '🏈', count: 1 }
      ]);
    }
  });

  it('tallies a repeat co-winner across weeks (#770)', () => {
    const week = (n: number): WeeklyPointsEntry[] => [
      pts({ user_id: 'a', display_name: 'Al', week_number: n, week_points: 9 }),
      pts({ user_id: 'b', display_name: 'Bo', week_number: n, week_points: 9 }),
      pts({ user_id: 'c', display_name: 'Cy', week_number: n, week_points: 0 })
    ];
    const shelf = computeSeasonShelf(
      computeWeeklyHardware({ points: [...week(1), ...week(2)], covers: [], consensus: [] })
    );
    expect(shelf.find((e) => e.user_id === 'a')!.awards).toEqual([
      { id: 'game-ball', short: 'Game Ball', emoji: '🏈', count: 2 }
    ]);
    expect(shelf.find((e) => e.user_id === 'b')!.awards).toEqual([
      { id: 'game-ball', short: 'Game Ball', emoji: '🏈', count: 2 }
    ]);
  });

  it('returns an empty shelf when no hardware was minted', () => {
    expect(computeSeasonShelf([])).toEqual([]);
  });
});

describe('flavor metadata', () => {
  it('has a flavor entry for every award id, in canonical order', () => {
    expect(WEEKLY_AWARD_ORDER).toEqual([
      'game-ball',
      'donkey-of-week',
      'bad-beat',
      'backdoor',
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

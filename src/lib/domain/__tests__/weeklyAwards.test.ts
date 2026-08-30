import { describe, it, expect } from 'vitest';
import {
  gameBallOfWeek,
  contrarianWinOfWeek,
  bullseyeOfWeek,
  computeWeeklyHardware,
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
    outcome: 'win',
    weight: 'A',
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

describe('bullseyeOfWeek (#866)', () => {
  it('mints the player whose All-In won', () => {
    const r = bullseyeOfWeek([
      cover({ user_id: 'a', display_name: 'Al', weight: 'A', outcome: 'win' }),
      cover({ user_id: 'b', display_name: 'Bo', weight: 'H', outcome: 'win' })
    ]);
    expect(r).toEqual({ holders: [{ user_id: 'a', display_name: 'Al' }] });
  });

  it('ignores every non-All-In weight, however the pick finished', () => {
    const r = bullseyeOfWeek([
      cover({ user_id: 'a', display_name: 'Al', weight: 'L', outcome: 'win' }),
      cover({ user_id: 'b', display_name: 'Bo', weight: 'M', outcome: 'win' }),
      cover({ user_id: 'c', display_name: 'Cy', weight: 'H', outcome: 'win' })
    ]);
    expect(r).toBeNull();
  });

  it('mints nothing for an All-In that lost, pushed, or was missed', () => {
    for (const outcome of ['loss', 'push', 'missed'] as const) {
      expect(bullseyeOfWeek([cover({ weight: 'A', outcome })])).toBeNull();
    }
  });

  it('returns null when nobody went All-In at all', () => {
    expect(bullseyeOfWeek([])).toBeNull();
    expect(bullseyeOfWeek([cover({ weight: 'M', outcome: 'win' })])).toBeNull();
  });

  it('mints every hit as a co-winner, in identity order and order-independent', () => {
    const a = cover({ user_id: 'z', display_name: 'Zoe', game_id: 'g1' });
    const b = cover({ user_id: 'a', display_name: 'Abe', game_id: 'g2' });
    const c = cover({ user_id: 'm', display_name: 'Moe', game_id: 'g3', outcome: 'loss' });
    // "Abe" < "Zoe" by locale compare; Moe's All-In lost and mints nothing.
    expect(bullseyeOfWeek([a, b, c])?.holders).toEqual([
      { user_id: 'a', display_name: 'Abe' },
      { user_id: 'z', display_name: 'Zoe' }
    ]);
    expect(bullseyeOfWeek([c, b, a])).toEqual(bullseyeOfWeek([a, b, c]));
  });

  it('does not mutate its input', () => {
    const rows = [
      cover({ user_id: 'z', display_name: 'Zoe', game_id: 'g1' }),
      cover({ user_id: 'a', display_name: 'Abe', game_id: 'g2' })
    ];
    const before = rows.map((r) => r.user_id);
    bullseyeOfWeek(rows);
    expect(rows.map((r) => r.user_id)).toEqual(before);
  });

  it('counts a player once even across two winning All-In rows', () => {
    // The lock_pick cap makes this unreachable in production (ADR-0023: one All-In per player
    // per week), but the dedupe is what keeps that a data invariant rather than a display bug.
    const r = bullseyeOfWeek([
      cover({ user_id: 'a', display_name: 'Abe', game_id: 'g1' }),
      cover({ user_id: 'a', display_name: 'Abe', game_id: 'g2' })
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
      // Week 1: Al hits an All-In; Bo's All-In loses.
      cover({
        user_id: 'a',
        display_name: 'Al',
        week_number: 1,
        game_id: 'g2',
        weight: 'A',
        outcome: 'win'
      }),
      cover({
        user_id: 'b',
        display_name: 'Bo',
        week_number: 1,
        game_id: 'g1',
        weight: 'A',
        outcome: 'loss'
      }),
      // Week 2: nobody went All-In, so no Bullseye mints.
      cover({
        user_id: 'a',
        display_name: 'Al',
        week_number: 2,
        game_id: 'g9',
        weight: 'H',
        outcome: 'win'
      })
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
    expect(week1.awards.map((a) => a.id)).toEqual(['game-ball', 'contrarian-win', 'bullseye']);
    // Week 1: Al tops the week, takes the lone pick, and hits the All-In. Bo's lost All-In
    // mints nothing — the catalog is all-positive since #866.
    const byId = Object.fromEntries(
      week1.awards.map((a) => [a.id, a.holders.map((h) => h.user_id)])
    );
    expect(byId).toEqual({
      'game-ball': ['a'],
      'contrarian-win': ['a'],
      bullseye: ['a']
    });
  });

  it('omits an award whose week produced no qualifier', () => {
    const week2 = computeWeeklyHardware(inputs).find((w) => w.week_number === 2)!;
    // No All-In in week 2, so Bullseye is absent rather than empty.
    expect(week2.awards.map((a) => a.id)).toEqual(['game-ball', 'contrarian-win']);
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

  it('mints no retired award, whatever the inputs look like (#866)', () => {
    const ids = computeWeeklyHardware(inputs).flatMap((w) => w.awards.map((a) => String(a.id)));
    for (const retired of ['donkey-of-week', 'bad-beat', 'backdoor']) {
      expect(ids).not.toContain(retired);
    }
  });
});

describe('flavor metadata', () => {
  it('has a flavor entry for every award id, in canonical order', () => {
    expect(WEEKLY_AWARD_ORDER).toEqual(['game-ball', 'contrarian-win', 'bullseye']);
    for (const id of WEEKLY_AWARD_ORDER) {
      const f = WEEKLY_AWARD_FLAVORS[id];
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.short.length).toBeGreaterThan(0);
      expect(f.emoji.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it('carries no flavor for a retired award (#866)', () => {
    const ids = Object.keys(WEEKLY_AWARD_FLAVORS);
    expect(ids).toEqual(['game-ball', 'contrarian-win', 'bullseye']);
  });
});

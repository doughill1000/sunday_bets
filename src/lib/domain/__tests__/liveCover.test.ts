import { describe, it, expect } from 'vitest';
import {
  atsMarginAtLock,
  liveCoverState,
  weekSoFarPoints,
  type LiveCoverInput
} from '../liveCover';

// Team ids used across the cases (values are arbitrary — only identity matters).
const HOME = 10;
const AWAY = 20;

function input(overrides: Partial<LiveCoverInput>): LiveCoverInput {
  return {
    homeScore: 0,
    awayScore: 0,
    homeTeamId: HOME,
    awayTeamId: AWAY,
    pickedTeamId: HOME,
    lockedSpreadTeamId: HOME,
    lockedSpreadValue: 0,
    ...overrides
  };
}

describe('atsMarginAtLock — mirror of ats_margin_at_lock.sql', () => {
  it('subtracts the spread when it is quoted for the home (favorite) side', () => {
    // Home leads 24-20 laying 3.5 → 4 - 3.5 = +0.5 (home still covering).
    expect(atsMarginAtLock(24, 20, HOME, AWAY, HOME, 3.5)).toBe(0.5);
  });

  it('adds the spread when it is quoted for the away side', () => {
    // Away trails 20-24 getting 3.5 → -4 + 3.5 = -0.5 (home covering by half).
    expect(atsMarginAtLock(20, 24, HOME, AWAY, AWAY, 3.5)).toBe(-0.5);
  });

  it('ignores magnitude sign — always uses abs(spreadValue)', () => {
    // A negative stored value for the home favorite must behave like the positive one.
    expect(atsMarginAtLock(24, 20, HOME, AWAY, HOME, -3.5)).toBe(0.5);
  });

  it('is a straight point differential on a pick-em / no line', () => {
    expect(atsMarginAtLock(21, 17, HOME, AWAY, null, null)).toBe(4);
    expect(atsMarginAtLock(21, 17, HOME, AWAY, HOME, 0)).toBe(4);
  });
});

describe('liveCoverState — mirror of grade_pick.sql win/loss/push', () => {
  it('home pick covering when home covers the spread', () => {
    const s = liveCoverState(input({ homeScore: 27, awayScore: 20, lockedSpreadValue: 3 }));
    expect(s).toEqual({ verdict: 'covering', margin: 4, cushion: 4 });
  });

  it('home pick not covering when home fails the spread', () => {
    const s = liveCoverState(input({ homeScore: 23, awayScore: 20, lockedSpreadValue: 6 }));
    expect(s?.verdict).toBe('not_covering');
    expect(s?.cushion).toBe(-3);
  });

  it('push exactly on the number', () => {
    const s = liveCoverState(input({ homeScore: 23, awayScore: 20, lockedSpreadValue: 3 }));
    expect(s).toEqual({ verdict: 'push', margin: 0, cushion: 0 });
  });

  it('away pick covering flips the cushion sign', () => {
    // Home favorite laying 6 but only up 24-20 (by 4) → home margin -2 (home did NOT cover),
    // so the away pick IS covering by 2.
    const s = liveCoverState(
      input({
        homeScore: 24,
        awayScore: 20,
        pickedTeamId: AWAY,
        lockedSpreadTeamId: HOME,
        lockedSpreadValue: 6
      })
    );
    expect(s).toEqual({ verdict: 'covering', margin: -2, cushion: 2 });
  });

  it('away pick not covering when home covers', () => {
    const s = liveCoverState(
      input({
        homeScore: 30,
        awayScore: 20,
        pickedTeamId: AWAY,
        lockedSpreadTeamId: HOME,
        lockedSpreadValue: 3
      })
    );
    expect(s?.verdict).toBe('not_covering');
    expect(s?.cushion).toBe(-7);
  });

  it('returns null for an unpicked or malformed pick', () => {
    expect(liveCoverState(input({ pickedTeamId: null }))).toBeNull();
    expect(liveCoverState(input({ homeTeamId: null }))).toBeNull();
    // pickedTeamId not matching either side (data drift) → no verdict rather than a wrong one.
    expect(liveCoverState(input({ pickedTeamId: 999 }))).toBeNull();
  });

  it('parity: liveCoverState verdict matches grade_pick sign rule across a grid', () => {
    // Independently recompute the SQL rule and assert the mirror agrees. This is the
    // load-bearing "identical to grading" guarantee at the display layer.
    for (const homeScore of [0, 17, 20, 24, 31]) {
      for (const awayScore of [0, 17, 20, 24, 31]) {
        for (const spreadValue of [0, 3, 3.5, 7]) {
          for (const spreadTeamId of [HOME, AWAY]) {
            for (const pickedTeamId of [HOME, AWAY]) {
              const margin = atsMarginAtLock(
                homeScore,
                awayScore,
                HOME,
                AWAY,
                spreadTeamId,
                spreadValue
              );
              const expected =
                margin === 0
                  ? 'push'
                  : (margin > 0 && pickedTeamId === HOME) || (margin < 0 && pickedTeamId === AWAY)
                    ? 'covering'
                    : 'not_covering';
              const state = liveCoverState(
                input({
                  homeScore,
                  awayScore,
                  pickedTeamId,
                  lockedSpreadTeamId: spreadTeamId,
                  lockedSpreadValue: spreadValue
                })
              );
              expect(state?.verdict).toBe(expected);
            }
          }
        }
      }
    }
  });
});

describe('weekSoFarPoints — live projection', () => {
  it('adds weight for covering picks, subtracts for not covering, ignores push/undecided', () => {
    expect(
      weekSoFarPoints([
        { weight: 'H', verdict: 'covering' }, // +5
        { weight: 'M', verdict: 'not_covering' }, // -3
        { weight: 'L', verdict: 'push' }, // 0
        { weight: 'A', verdict: null }, // undecided → 0
        { weight: null, verdict: 'covering' } // no weight → 0
      ])
    ).toBe(2);
  });

  it('is 0 for an empty or all-undecided slate', () => {
    expect(weekSoFarPoints([])).toBe(0);
    expect(weekSoFarPoints([{ weight: 'H', verdict: null }])).toBe(0);
  });
});

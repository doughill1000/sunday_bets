// tests/domain/spread.test.ts
import { describe, it, expect } from 'vitest';
import {
  gameCover,
  hasLine,
  spreadLine,
  signedSpreadForTeam,
  type GameCoverShape,
  type SpreadShape
} from '../../domain/spread';
import type { PickGame } from '../../types/games';

// ---------------------------------------------------------------------------
// ATS scoring matrix — pure-TS model of the DB grade_pick / weight_points logic
//
// SQL sources:
//   supabase/src/functions/_private/ats_margin_at_lock.sql
//   supabase/src/functions/_private/weight_points.sql
//   supabase/src/functions/grade/grade_pick.sql
//
// These functions are tested at the DB layer via pgTAP; this suite verifies
// the same semantic rules as pure-TS unit tests so regressions surface
// without requiring a running Supabase instance.
// ---------------------------------------------------------------------------

type WeightCode = 'L' | 'M' | 'H' | 'A';
type PickOutcome = 'win' | 'loss' | 'push';

/** Mirror of public.weight_points(p_weight) */
function weightPoints(weight: WeightCode): number {
  switch (weight) {
    case 'L':
      return 1;
    case 'M':
      return 3;
    case 'H':
      return 5;
    case 'A':
      return 10;
  }
}

/**
 * Mirror of public.ats_margin_at_lock().
 * Returns the ATS margin from the home team's perspective:
 *   positive  -> home covered
 *   negative  -> away covered
 *   zero      -> push
 *
 * spreadTeamId is the id of the favoured team.
 * spreadValue  is stored as a positive absolute number.
 */
function atsMarginAtLock(
  homePts: number,
  awayPts: number,
  homeId: number,
  awayId: number,
  spreadTeamId: number,
  spreadValue: number
): number {
  const rawMargin = homePts - awayPts;
  if (spreadTeamId === homeId) {
    return rawMargin - Math.abs(spreadValue); // home gives points
  } else if (spreadTeamId === awayId) {
    return rawMargin + Math.abs(spreadValue); // away gives points (home gains)
  }
  return rawMargin;
}

/**
 * Mirror of public.grade_pick().
 * pickedTeamId is either homeId or awayId.
 */
function gradePick(
  homePts: number,
  awayPts: number,
  homeId: number,
  awayId: number,
  pickedTeamId: number,
  spreadTeamId: number,
  spreadValue: number,
  weight: WeightCode
): { pointsDelta: number; outcome: PickOutcome } {
  const margin = atsMarginAtLock(homePts, awayPts, homeId, awayId, spreadTeamId, spreadValue);
  const pts = weightPoints(weight);

  if (margin === 0) {
    return { pointsDelta: 0, outcome: 'push' };
  }

  const homeCovered = margin > 0;
  const pickerChoseHome = pickedTeamId === homeId;
  const win = homeCovered === pickerChoseHome;

  return {
    pointsDelta: win ? pts : -pts,
    outcome: win ? 'win' : 'loss'
  };
}

const g = (overrides: Partial<PickGame> = {}): PickGame => ({
  id: 'g1',
  kickoff: '2025-09-14T17:00:00Z',
  home: 'CIN',
  away: 'JAX',
  homeTeamId: 1,
  awayTeamId: 2,
  spreadTeamId: 1,
  spreadValue: 3.5,
  ...overrides
});

describe('spread helpers', () => {
  it('spreadLine prints favorite and number', () => {
    expect(spreadLine(g())).toBe('CIN -3.5');
  });
  it('PK when spreadValue is 0', () => {
    expect(spreadLine(g({ spreadValue: 0 }))).toBe('PK');
  });
  it('No line when null', () => {
    expect(spreadLine(g({ spreadValue: null as any }))).toBe('No line');
  });
  it('spreadLine handles negative spreadValue without double-minus (regression)', () => {
    // DB may store the active line as a negative number for the favorite side.
    expect(spreadLine(g({ spreadValue: -3.5 }))).toBe('CIN -3.5');
  });
  it('spreadLine away team as favorite', () => {
    expect(spreadLine(g({ spreadTeamId: 2 }))).toBe('JAX -3.5');
  });

  // #836 — /week's WeeklyGameBreakdown renders the line through this same formatter rather than
  // re-deriving the convention, so it has to accept any shape carrying the line, not a PickGame.
  it('spreadLine accepts a bare structural shape (the /week card)', () => {
    const weekCard: SpreadShape = {
      home: 'BUF',
      away: 'CIN',
      homeTeamId: 4,
      spreadTeamId: 4,
      spreadValue: 3.5
    };
    expect(spreadLine(weekCard)).toBe('BUF -3.5');
    expect(spreadLine({ ...weekCard, spreadTeamId: 9 })).toBe('CIN -3.5');
    expect(spreadLine({ ...weekCard, spreadValue: 0 })).toBe('PK');
  });

  it('signedSpreadForTeam uses +/- from team perspective', () => {
    expect(signedSpreadForTeam(g(), 'home')).toBe(' -3.5'); // favorite
    expect(signedSpreadForTeam(g(), 'away')).toBe(' +3.5'); // dog
  });
  it('signedSpreadForTeam handles negative spreadValue without double-minus (regression)', () => {
    expect(signedSpreadForTeam(g({ spreadValue: -3.5 }), 'home')).toBe(' -3.5');
    expect(signedSpreadForTeam(g({ spreadValue: -3.5 }), 'away')).toBe(' +3.5');
  });
  it('signedSpreadForTeam returns PK when spreadValue is 0', () => {
    expect(signedSpreadForTeam(g({ spreadValue: 0 }), 'home')).toBe(' PK');
    expect(signedSpreadForTeam(g({ spreadValue: 0 }), 'away')).toBe(' PK');
  });
  it('signedSpreadForTeam returns empty string when null', () => {
    expect(signedSpreadForTeam(g({ spreadValue: null as any }), 'home')).toBe('');
  });

  // #802 — the pickability predicate. A pick'em is a real line; only null is "not posted".
  it('hasLine is false only when spreadValue is null', () => {
    expect(hasLine(g())).toBe(true);
    expect(hasLine(g({ spreadValue: 0 }))).toBe(true); // PK is a real line
    expect(hasLine(g({ spreadValue: -3.5 }))).toBe(true);
    expect(hasLine(g({ spreadValue: null as any }))).toBe(false);
    expect(hasLine(g({ spreadValue: undefined as any }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// gameCover — the /week card's "who beat the number, and by how much" (#838)
//
// Settles the GAME's line, not any member's frozen one. It reuses the same
// ats_margin_at_lock mirror grading uses, so these cases double as a check that
// favorite/underdog is read from spread_team_id's identity rather than the sign
// of spread_value (the #734 inversion).
// ---------------------------------------------------------------------------

describe('gameCover', () => {
  // CIN home (id 1) vs JAX away (id 2), CIN favoured by 3.5.
  const card = (overrides: Partial<GameCoverShape> = {}): GameCoverShape => ({
    home: 'CIN',
    away: 'JAX',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: 3.5,
    homeScore: null,
    awayScore: null,
    ...overrides
  });

  it('home favourite covers → names the home team and the daylight', () => {
    // CIN -3.5 wins 27-20 (margin 7): 7 - 3.5 = +3.5.
    expect(gameCover(card({ homeScore: 27, awayScore: 20 }))).toEqual({
      side: 'home',
      team: 'CIN',
      by: 3.5
    });
  });

  it('home favourite fails → the underdog covered, by the shortfall', () => {
    // CIN -3.5 wins 24-21 (margin 3): 3 - 3.5 = -0.5, so JAX covered by 0.5.
    expect(gameCover(card({ homeScore: 24, awayScore: 21 }))).toEqual({
      side: 'away',
      team: 'JAX',
      by: 0.5
    });
  });

  it('away favourite covers → names the away team', () => {
    // JAX -3 wins 28-20 (home margin -8): -8 + 3 = -5, so JAX covered by 5.
    expect(
      gameCover(card({ spreadTeamId: 2, spreadValue: 3, homeScore: 20, awayScore: 28 }))
    ).toEqual({ side: 'away', team: 'JAX', by: 5 });
  });

  it('away favourite fails → the home underdog covered', () => {
    // JAX -7 wins 24-21 (home margin -3): -3 + 7 = +4, so CIN covered by 4.
    expect(
      gameCover(card({ spreadTeamId: 2, spreadValue: 7, homeScore: 21, awayScore: 24 }))
    ).toEqual({ side: 'home', team: 'CIN', by: 4 });
  });

  it('landing exactly on the number is a push with no side', () => {
    // CIN -7 wins 31-24 (margin 7): 7 - 7 = 0.
    expect(gameCover(card({ spreadValue: 7, homeScore: 31, awayScore: 24 }))).toEqual({
      side: null,
      team: null,
      by: 0
    });
  });

  // A pick'em is a real line (#802), and it needs no special case: the adjustment is zero, so
  // the straight-up winner covers and a tie is a push.
  it('pick’em resolves to the straight-up margin', () => {
    expect(gameCover(card({ spreadValue: 0, homeScore: 24, awayScore: 20 }))).toEqual({
      side: 'home',
      team: 'CIN',
      by: 4
    });
    expect(gameCover(card({ spreadValue: 0, homeScore: 20, awayScore: 24 }))).toEqual({
      side: 'away',
      team: 'JAX',
      by: 4
    });
    expect(gameCover(card({ spreadValue: 0, homeScore: 20, awayScore: 20 }))?.side).toBeNull();
  });

  // Same regression spreadLine/signedSpreadForTeam carry: a legacy negative magnitude must not
  // flip which side is favoured.
  it('a negative stored magnitude settles identically to its absolute value', () => {
    expect(gameCover(card({ spreadValue: -3.5, homeScore: 27, awayScore: 20 }))).toEqual(
      gameCover(card({ spreadValue: 3.5, homeScore: 27, awayScore: 20 }))
    );
  });

  it('returns null when it cannot be settled', () => {
    // No line at all — an unlined game was never pickable (#802/#803).
    expect(gameCover(card({ spreadValue: null, homeScore: 27, awayScore: 20 }))).toBeNull();
    // No score yet (pre-kickoff, or a stale feed we stopped asserting).
    expect(gameCover(card())).toBeNull();
    expect(gameCover(card({ homeScore: 27 }))).toBeNull();
    expect(gameCover(card({ awayScore: 20 }))).toBeNull();
    // Missing team ids — the sides cannot be joined to the line.
    expect(gameCover(card({ homeTeamId: null, homeScore: 27, awayScore: 20 }))).toBeNull();
    expect(gameCover(card({ awayTeamId: null, homeScore: 27, awayScore: 20 }))).toBeNull();
  });

  it('settles a 0-0 game rather than treating it as no score', () => {
    // JAX +3.5 with nothing on the board: 0 - 3.5 = -3.5, the dog is covering.
    expect(gameCover(card({ homeScore: 0, awayScore: 0 }))).toEqual({
      side: 'away',
      team: 'JAX',
      by: 3.5
    });
  });
});

// ---------------------------------------------------------------------------
// ATS scoring matrix
// ---------------------------------------------------------------------------

const HOME_ID = 1;
const AWAY_ID = 2;

describe('ATS scoring matrix', () => {
  // ---- Home favourite -------------------------------------------------------

  it('home favourite covers: picker chose home → win', () => {
    // Home -6.5: home wins 34-24 (margin=10), ATS margin = 10-6.5 = +3.5 > 0
    const result = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'M');
    expect(result.outcome).toBe('win');
    expect(result.pointsDelta).toBe(3); // M weight = 3
  });

  it('home favourite covers: picker chose away → loss', () => {
    const result = gradePick(34, 24, HOME_ID, AWAY_ID, AWAY_ID, HOME_ID, 6.5, 'M');
    expect(result.outcome).toBe('loss');
    expect(result.pointsDelta).toBe(-3);
  });

  it('home favourite fails to cover: picker chose home → loss', () => {
    // Home wins by 3, spread is -6.5: ATS margin = 3 - 6.5 = -3.5 < 0
    const result = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'M');
    expect(result.outcome).toBe('loss');
    expect(result.pointsDelta).toBe(-3);
  });

  it('home favourite fails to cover: picker chose away → win', () => {
    const result = gradePick(27, 24, HOME_ID, AWAY_ID, AWAY_ID, HOME_ID, 6.5, 'M');
    expect(result.outcome).toBe('win');
    expect(result.pointsDelta).toBe(3);
  });

  // ---- Away favourite -------------------------------------------------------

  it('away favourite covers: picker chose away → win', () => {
    // Away -3: away wins 28-20 (home margin = -8), ATS margin = -8 + 3 = -5 < 0 → away covered
    const result = gradePick(20, 28, HOME_ID, AWAY_ID, AWAY_ID, AWAY_ID, 3, 'H');
    expect(result.outcome).toBe('win');
    expect(result.pointsDelta).toBe(5); // H weight = 5
  });

  it('away favourite covers: picker chose home → loss', () => {
    const result = gradePick(20, 28, HOME_ID, AWAY_ID, HOME_ID, AWAY_ID, 3, 'H');
    expect(result.outcome).toBe('loss');
    expect(result.pointsDelta).toBe(-5);
  });

  it('away favourite fails to cover: picker chose away → loss', () => {
    // Away -7: away wins 24-21 (home margin = -3), ATS margin = -3 + 7 = +4 > 0 → home covered (away did NOT cover)
    const result = gradePick(21, 24, HOME_ID, AWAY_ID, AWAY_ID, AWAY_ID, 7, 'H');
    expect(result.outcome).toBe('loss');
    expect(result.pointsDelta).toBe(-5);
  });

  it('away favourite fails to cover: picker chose home → win', () => {
    const result = gradePick(21, 24, HOME_ID, AWAY_ID, HOME_ID, AWAY_ID, 7, 'H');
    expect(result.outcome).toBe('win');
    expect(result.pointsDelta).toBe(5);
  });

  // ---- Push -----------------------------------------------------------------

  it('push: ATS margin exactly 0 → outcome push and 0 points regardless of picked side', () => {
    // Home -7: home wins 31-24 (margin=7), ATS margin = 7 - 7 = 0
    const homePicker = gradePick(31, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 7, 'A');
    expect(homePicker.outcome).toBe('push');
    expect(homePicker.pointsDelta).toBe(0);

    const awayPicker = gradePick(31, 24, HOME_ID, AWAY_ID, AWAY_ID, HOME_ID, 7, 'A');
    expect(awayPicker.outcome).toBe('push');
    expect(awayPicker.pointsDelta).toBe(0);
  });

  // ---- Weight scales magnitude only ----------------------------------------
  // The same ATS result (win or loss) should produce a points delta equal to
  // +/- weightPoints(weight), confirming weight only scales the magnitude and
  // does not affect the win/loss sign.

  it('weight L → +1 on win, -1 on loss', () => {
    const win = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'L');
    const loss = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'L');
    expect(win.pointsDelta).toBe(1);
    expect(loss.pointsDelta).toBe(-1);
  });

  it('weight M → +3 on win, -3 on loss', () => {
    const win = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'M');
    const loss = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'M');
    expect(win.pointsDelta).toBe(3);
    expect(loss.pointsDelta).toBe(-3);
  });

  it('weight H → +5 on win, -5 on loss', () => {
    const win = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'H');
    const loss = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'H');
    expect(win.pointsDelta).toBe(5);
    expect(loss.pointsDelta).toBe(-5);
  });

  it('weight A → +10 on win, -10 on loss', () => {
    const win = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'A');
    const loss = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, 'A');
    expect(win.pointsDelta).toBe(10);
    expect(loss.pointsDelta).toBe(-10);
  });

  it('weight only scales magnitude: ATS result (win/loss) is the same across all weights', () => {
    // All four weights with the same covering scenario should all be wins.
    const weights: WeightCode[] = ['L', 'M', 'H', 'A'];
    for (const w of weights) {
      const { outcome } = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, w);
      expect(outcome).toBe('win');
    }
    // And the same non-covering scenario should all be losses.
    for (const w of weights) {
      const { outcome } = gradePick(27, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, w);
      expect(outcome).toBe('loss');
    }
  });

  it('pointsDelta magnitude equals weightPoints value for each weight code', () => {
    const cases: Array<[WeightCode, number]> = [
      ['L', 1],
      ['M', 3],
      ['H', 5],
      ['A', 10]
    ];
    for (const [w, expected] of cases) {
      const { pointsDelta } = gradePick(34, 24, HOME_ID, AWAY_ID, HOME_ID, HOME_ID, 6.5, w);
      expect(Math.abs(pointsDelta)).toBe(expected);
    }
  });
});

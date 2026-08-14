import { describe, it, expect } from 'vitest';
import { weekUnderwayCounts } from '../weekUnderway';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';

// The counts behind the `/picks` handoff strip (#832). Every input is a database read — graded
// final scores and settled outcomes — so these cases are the whole contract: there is no live
// feed to fall back on.

function game(id: string, over: Partial<PickGame> = {}): PickGame {
  return {
    id,
    kickoff: '2026-09-13T17:00:00Z',
    home: 'KC',
    away: 'BUF',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3,
    ...over
  };
}

const LOCKED: PickEntry = { lockedPick: { team: 'home', weight: 'M' } };

describe('weekUnderwayCounts', () => {
  it('is all zeroes when nothing has kicked off', () => {
    expect(weekUnderwayCounts([], {})).toEqual({
      total: 0,
      inPlay: 0,
      final: 0,
      missed: 0,
      settledCount: 0,
      settledPoints: 0
    });
  });

  it('splits underway games into in-play and final on the graded score, not a clock', () => {
    const counts = weekUnderwayCounts(
      [
        game('a'),
        game('b'),
        game('c', { finalScores: { home: 27, away: 20 } }),
        // `final_scores` present but the game only just kicked off is still "final" here:
        // grading is the sole writer, so its presence IS the settled signal.
        game('d', { finalScores: { home: 0, away: 0 } })
      ],
      { a: LOCKED, b: LOCKED, c: LOCKED, d: LOCKED }
    );
    expect(counts.total).toBe(4);
    expect(counts.inPlay).toBe(2);
    expect(counts.final).toBe(2);
  });

  it('counts an unpicked kickoff as missed', () => {
    const counts = weekUnderwayCounts([game('a'), game('b')], { a: LOCKED });
    expect(counts.missed).toBe(1);
  });

  it('never counts an unlined game as missed (#803 / ADR-0040 — grading charges no penalty)', () => {
    const counts = weekUnderwayCounts(
      [game('a', { spreadTeamId: null, spreadValue: null }), game('b')],
      {}
    );
    // `b` had a line and no pick; `a` was never pickable.
    expect(counts.missed).toBe(1);
  });

  it('treats a pick’em (spread 0) as a real line, so missing it counts', () => {
    const counts = weekUnderwayCounts([game('a', { spreadValue: 0 })], {});
    expect(counts.missed).toBe(1);
  });

  it('prefers the settled outcome over the local heuristic in both directions', () => {
    const counts = weekUnderwayCounts(
      [
        // No local pick, but grading settled it as a push — e.g. a pick made in another
        // session. The settlement wins: not missed.
        game('a'),
        // Grading settled this one as missed even though the local entry looks harmless.
        game('b')
      ],
      {
        a: { outcome: 'push', pointsDelta: 0 },
        b: { outcome: 'missed', pointsDelta: -3 }
      }
    );
    expect(counts.missed).toBe(1);
  });

  it('sums settled points, counting only games grading has actually ruled on', () => {
    const counts = weekUnderwayCounts(
      [
        game('a', { finalScores: { home: 27, away: 20 } }),
        game('b', { finalScores: { home: 10, away: 24 } }),
        game('c', { finalScores: { home: 17, away: 17 } }),
        game('d') // still in play — no settlement yet
      ],
      {
        a: { ...LOCKED, outcome: 'win', pointsDelta: 3 },
        b: { ...LOCKED, outcome: 'loss', pointsDelta: -3 },
        c: { ...LOCKED, outcome: 'push', pointsDelta: 0 },
        d: LOCKED
      }
    );
    expect(counts.settledCount).toBe(3);
    expect(counts.settledPoints).toBe(0);
    expect(counts.inPlay).toBe(1);
    expect(counts.final).toBe(3);
  });

  it('tolerates a settled row with a null points delta', () => {
    const counts = weekUnderwayCounts([game('a', { finalScores: { home: 1, away: 0 } })], {
      a: { ...LOCKED, outcome: 'win', pointsDelta: null }
    });
    expect(counts.settledCount).toBe(1);
    expect(counts.settledPoints).toBe(0);
  });

  it('reports a negative net when the week has gone badly', () => {
    const counts = weekUnderwayCounts(
      [game('a', { finalScores: { home: 3, away: 30 } }), game('b')],
      {
        a: { ...LOCKED, outcome: 'loss', pointsDelta: -5 },
        b: {} // kicked off with no pick
      }
    );
    expect(counts.settledPoints).toBe(-5);
    expect(counts.missed).toBe(1);
  });
});

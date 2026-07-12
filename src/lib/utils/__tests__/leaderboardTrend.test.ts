import { describe, expect, it } from 'vitest';
import { hasGradedWeek, rankMovements } from '../leaderboardTrend';
import type { SeasonTrendEntry } from '$lib/types/server/stats';

// Minimal trend row: rank movement only reads user_id, week_number, and cumulative_rank_this_week.
const row = (
  user_id: string,
  week_number: number,
  cumulative_rank_this_week: number
): SeasonTrendEntry => ({
  user_id,
  display_name: user_id,
  season_year: 2026,
  week_number,
  week_points: 0,
  week_wins: 0,
  week_losses: 0,
  week_pushes: 0,
  week_missed: 0,
  is_dropped_week: false,
  cumulative_points: 0,
  season_total: 0,
  cumulative_rank_this_week
});

describe('hasGradedWeek', () => {
  it('is false for an empty trend and true once any row exists', () => {
    expect(hasGradedWeek([])).toBe(false);
    expect(hasGradedWeek([row('a', 1, 1)])).toBe(true);
  });
});

describe('rankMovements', () => {
  it('returns an empty map when fewer than two graded weeks exist', () => {
    expect(rankMovements([]).size).toBe(0);
    expect(rankMovements([row('a', 1, 1), row('b', 1, 2)]).size).toBe(0);
  });

  it('diffs the two most-recent graded weeks: positive = climbed', () => {
    // Week 1: a=1, b=2, c=3. Week 2: a=2, b=1, c=3.
    const trend = [
      row('a', 1, 1),
      row('b', 1, 2),
      row('c', 1, 3),
      row('a', 2, 2),
      row('b', 2, 1),
      row('c', 2, 3)
    ];
    const moves = rankMovements(trend);
    expect(moves.get('a')).toBe(-1); // slipped 1 → 2
    expect(moves.get('b')).toBe(1); // climbed 2 → 1
    expect(moves.get('c')).toBe(0); // held at 3
  });

  it('only compares the latest two weeks, ignoring earlier ones', () => {
    const trend = [
      row('a', 1, 3),
      row('a', 2, 2),
      row('a', 3, 1) // latest vs week 2: climbed 2 → 1
    ];
    expect(rankMovements(trend).get('a')).toBe(1);
  });

  it('omits a player absent from the previous graded week', () => {
    // c only appears in the latest week → no prior rank → neutral dash (absent from the map).
    const trend = [row('a', 1, 1), row('b', 1, 2), row('a', 2, 1), row('b', 2, 2), row('c', 2, 3)];
    const moves = rankMovements(trend);
    expect(moves.has('c')).toBe(false);
    expect(moves.get('a')).toBe(0);
    expect(moves.get('b')).toBe(0);
  });
});

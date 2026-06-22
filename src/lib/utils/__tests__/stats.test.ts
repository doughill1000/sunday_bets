import { describe, expect, it } from 'vitest';
import { buildTrendSeries, formatAccuracy, weightLabel } from '../stats';
import type { SeasonTrendEntry } from '$lib/types/server/stats';

const trendRow = (
  user_id: string,
  display_name: string,
  week_number: number,
  cumulative_points: number
): SeasonTrendEntry => ({
  user_id,
  display_name,
  season_year: 2026,
  week_number,
  week_points: cumulative_points,
  week_wins: 1,
  week_losses: 0,
  week_pushes: 0,
  week_missed: 0,
  cumulative_points,
  season_total: cumulative_points,
  cumulative_rank_this_week: 1
});

describe('stats utilities', () => {
  it('groups trend rows by player and sorts players and weeks', () => {
    const result = buildTrendSeries([
      trendRow('b', 'Beth', 2, 4),
      trendRow('a', 'Alex', 2, 6),
      trendRow('b', 'Beth', 1, 1),
      trendRow('a', 'Alex', 1, 3)
    ]);

    expect(result.map((series) => series.displayName)).toEqual(['Alex', 'Beth']);
    expect(result[1].points).toEqual([
      { week_number: 1, cumulative_points: 1 },
      { week_number: 2, cumulative_points: 4 }
    ]);
  });

  it('formats accuracy and weight labels', () => {
    expect(formatAccuracy(0.6667)).toBe('67%');
    expect(formatAccuracy(null)).toBe('--');
    expect(weightLabel('A')).toBe('All-In');
  });
});

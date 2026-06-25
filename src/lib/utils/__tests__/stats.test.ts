import { describe, expect, it } from 'vitest';
import { buildTrendSeries, formatAccuracy, headToHeadForUser } from '../stats';
import type { HeadToHeadEntry, SeasonTrendEntry } from '$lib/types/server/stats';

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

const h2hRow = (
  overrides: Pick<
    HeadToHeadEntry,
    | 'user_id'
    | 'display_name'
    | 'opponent_user_id'
    | 'opponent_display_name'
    | 'wins'
    | 'losses'
    | 'pushes'
    | 'points'
    | 'opponent_points'
  >
): HeadToHeadEntry => ({
  season_year: 2026,
  games_compared: overrides.wins + overrides.losses + overrides.pushes,
  ...overrides
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

  it('formats accuracy', () => {
    expect(formatAccuracy(0.6667)).toBe('67%');
    expect(formatAccuracy(null)).toBe('--');
  });

  it('normalizes head-to-head rows to the selected user, flipping the opponent direction', () => {
    const rows: HeadToHeadEntry[] = [
      // Alex is the subject vs Beth: 3-1, 12 to 5 pts
      h2hRow({
        user_id: 'a',
        display_name: 'Alex',
        opponent_user_id: 'b',
        opponent_display_name: 'Beth',
        wins: 3,
        losses: 1,
        pushes: 0,
        points: 12,
        opponent_points: 5
      }),
      // Cara is the subject vs Alex: 2-4, 8 to 15 pts -> from Alex's view should flip to 4-2, 15 to 8
      h2hRow({
        user_id: 'c',
        display_name: 'Cara',
        opponent_user_id: 'a',
        opponent_display_name: 'Alex',
        wins: 2,
        losses: 4,
        pushes: 1,
        points: 8,
        opponent_points: 15
      }),
      // Unrelated pair should be ignored
      h2hRow({
        user_id: 'b',
        display_name: 'Beth',
        opponent_user_id: 'c',
        opponent_display_name: 'Cara',
        wins: 1,
        losses: 1,
        pushes: 0,
        points: 4,
        opponent_points: 4
      })
    ];

    const result = headToHeadForUser(rows, 'a');

    // Sorted by opponent display name: Beth then Cara
    expect(result.map((r) => r.opponentDisplayName)).toEqual(['Beth', 'Cara']);

    expect(result[0]).toMatchObject({
      opponentUserId: 'b',
      wins: 3,
      losses: 1,
      pushes: 0,
      points: 12,
      opponentPoints: 5
    });

    // Flipped row: Alex was the opponent of Cara
    expect(result[1]).toMatchObject({
      opponentUserId: 'c',
      wins: 4,
      losses: 2,
      pushes: 1,
      points: 15,
      opponentPoints: 8
    });
  });
});

import { describe, it, expect } from 'vitest';
import { denseRankAllTime } from '../leaderboard';

describe('denseRankAllTime', () => {
  it('ranks by total_points descending', () => {
    const result = denseRankAllTime([
      { user_id: 'a', total_points: 10, wins: 1, pushes: 0 },
      { user_id: 'b', total_points: 20, wins: 1, pushes: 0 }
    ]);
    expect(result.map((r) => r.user_id)).toEqual(['b', 'a']);
    expect(result.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('breaks ties with wins, then pushes', () => {
    const result = denseRankAllTime([
      { user_id: 'a', total_points: 10, wins: 2, pushes: 1 },
      { user_id: 'b', total_points: 10, wins: 3, pushes: 0 },
      { user_id: 'c', total_points: 10, wins: 2, pushes: 2 }
    ]);
    expect(result.map((r) => r.user_id)).toEqual(['b', 'c', 'a']);
  });

  it('shares dense rank across exact ties and skips to the next cardinal position', () => {
    const result = denseRankAllTime([
      { user_id: 'a', total_points: 10, wins: 1, pushes: 0 },
      { user_id: 'b', total_points: 10, wins: 1, pushes: 0 },
      { user_id: 'c', total_points: 5, wins: 0, pushes: 0 }
    ]);
    expect(result.map((r) => r.rank)).toEqual([1, 1, 2]);
  });

  it('does not mutate the input array', () => {
    const input = [
      { user_id: 'a', total_points: 1, wins: 0, pushes: 0 },
      { user_id: 'b', total_points: 2, wins: 0, pushes: 0 }
    ];
    denseRankAllTime(input);
    expect(input.map((r) => r.user_id)).toEqual(['a', 'b']);
  });

  it('preserves the rest of each entry alongside the computed rank', () => {
    const result = denseRankAllTime([
      { user_id: 'a', display_name: 'Alice', total_points: 5, wins: 1, pushes: 0 }
    ]);
    expect(result[0]).toEqual({
      user_id: 'a',
      display_name: 'Alice',
      total_points: 5,
      wins: 1,
      pushes: 0,
      rank: 1
    });
  });
});

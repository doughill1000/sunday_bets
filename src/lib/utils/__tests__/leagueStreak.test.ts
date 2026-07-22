import { describe, it, expect } from 'vitest';
import { formatStreak } from '$lib/utils/leagueStreak';

describe('formatStreak', () => {
  it('renders a cover run as W{n} and a non-cover run as L{n}', () => {
    expect(formatStreak({ streakResult: 'win', streakLength: 3 })).toBe('W3');
    expect(formatStreak({ streakResult: 'loss', streakLength: 2 })).toBe('L2');
  });

  it('renders a most-recent push (length 0) as no active streak', () => {
    // Matches league_ats_streaks: a push carries no cover momentum, so there is no run.
    expect(formatStreak({ streakResult: 'push', streakLength: 0 })).toBe('—');
  });

  it('renders a zero-length run as no active streak regardless of result', () => {
    expect(formatStreak({ streakResult: 'win', streakLength: 0 })).toBe('—');
  });
});

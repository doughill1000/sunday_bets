import { describe, it, expect } from 'vitest';
import { formatStreak, partitionHotCold } from '$lib/utils/leagueStreak';
import type { LeagueTeamStreak } from '$lib/types/server/league';

const streak = (over: Partial<LeagueTeamStreak>): LeagueTeamStreak => ({
  teamId: 1,
  teamName: 'Team One',
  teamShortName: 'ONE',
  streakResult: 'win',
  streakLength: 1,
  last4: { wins: 0, losses: 0, pushes: 0 },
  ...over
});

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

describe('partitionHotCold', () => {
  it('splits into cover (hot) and non-cover (cold) runs, longest first', () => {
    const streaks = [
      streak({ teamId: 1, teamShortName: 'AAA', streakResult: 'win', streakLength: 2 }),
      streak({ teamId: 2, teamShortName: 'BBB', streakResult: 'win', streakLength: 4 }),
      streak({ teamId: 3, teamShortName: 'CCC', streakResult: 'loss', streakLength: 3 }),
      streak({ teamId: 4, teamShortName: 'DDD', streakResult: 'loss', streakLength: 1 })
    ];
    const { hot, cold } = partitionHotCold(streaks);
    expect(hot.map((s) => s.teamShortName)).toEqual(['BBB', 'AAA']);
    expect(cold.map((s) => s.teamShortName)).toEqual(['CCC', 'DDD']);
  });

  it('breaks ties on streak length by team short name', () => {
    const streaks = [
      streak({ teamId: 1, teamShortName: 'ZZZ', streakResult: 'win', streakLength: 2 }),
      streak({ teamId: 2, teamShortName: 'AAA', streakResult: 'win', streakLength: 2 })
    ];
    expect(partitionHotCold(streaks).hot.map((s) => s.teamShortName)).toEqual(['AAA', 'ZZZ']);
  });

  it('excludes teams on a push or a zero-length run from both lists', () => {
    const streaks = [
      streak({ teamId: 1, streakResult: 'push', streakLength: 0 }),
      streak({ teamId: 2, streakResult: 'win', streakLength: 0 }),
      streak({ teamId: 3, streakResult: 'win', streakLength: 1 })
    ];
    const { hot, cold } = partitionHotCold(streaks);
    expect(hot.map((s) => s.teamId)).toEqual([3]);
    expect(cold).toEqual([]);
  });
});

// Pure helpers for the /league Hot/Cold module (issue #428). Kept out of the component so the
// streak-display and hot/cold-partition rules live in one place and can be unit-tested.
import type { LeagueTeamStreak } from '$lib/types/server/league';

/**
 * Short streak badge from the view's convention (league_ats_streaks): a cover run reads
 * `W{n}`, a non-cover run `L{n}`. A push carries no cover momentum, so it is neither — a
 * most-recent push (`streakResult = 'push'`, `streakLength = 0`) and any zero-length run
 * render as `—` (no active streak). Mirrors the view header's push rule exactly.
 */
export function formatStreak(
  streak: Pick<LeagueTeamStreak, 'streakResult' | 'streakLength'>
): string {
  if (streak.streakLength <= 0 || streak.streakResult === 'push') return '—';
  return `${streak.streakResult === 'win' ? 'W' : 'L'}${streak.streakLength}`;
}

/**
 * Split teams into the Hot (current cover run) and Cold (current non-cover run) lists,
 * each ordered longest-streak-first with the team short name as a stable tiebreak. Teams on
 * no active streak — a most-recent push, or a zero-length run — belong to neither list
 * (their cover momentum is undecided, per the view's push convention).
 */
export function partitionHotCold(streaks: LeagueTeamStreak[]): {
  hot: LeagueTeamStreak[];
  cold: LeagueTeamStreak[];
} {
  const byStreakDesc = (a: LeagueTeamStreak, b: LeagueTeamStreak) =>
    b.streakLength - a.streakLength || a.teamShortName.localeCompare(b.teamShortName);
  const active = streaks.filter((s) => s.streakLength > 0 && s.streakResult !== 'push');
  return {
    hot: active.filter((s) => s.streakResult === 'win').sort(byStreakDesc),
    cold: active.filter((s) => s.streakResult === 'loss').sort(byStreakDesc)
  };
}

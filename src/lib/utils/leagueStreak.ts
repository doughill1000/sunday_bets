// Pure streak-display helper for the /market team book's streak chips (issue #428; the
// standalone Hot/Cold module it originally served was folded into the team rows by #692).
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

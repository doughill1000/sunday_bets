import type { PickGame } from '$lib/types/games';
import type { TeamSide } from '$lib/types/domain';

/**
 * The favorite side ('home' | 'away') for a game, or `null` when there is no line
 * (`spreadValue == null`) or it's a pick'em (`spreadValue === 0`). Used to pre-stage
 * the starting team and to re-stage a game after an All-In is moved away from it.
 */
export function favoriteSide(g: PickGame): TeamSide | null {
  if (g.spreadValue == null || g.spreadValue === 0) return null;
  return g.spreadTeamId === g.homeTeamId ? 'home' : 'away';
}

/**
 * Whether the game has an active posted line, i.e. whether it can be picked at all (#802).
 * A pick'em (`spreadValue === 0`) **is** a line and stays fully pickable — only `null`
 * means "not posted yet". The client gate this feeds is defense in depth; the real
 * integrity boundary is the `no active line` guard in `lock_pick` /
 * `lock_pick_all_groups`.
 */
export function hasLine(g: PickGame): boolean {
  return g.spreadValue != null;
}

export function spreadLine(g: PickGame): string {
  if (g.spreadValue == null) return 'No line';
  if (g.spreadValue === 0) return 'PK';
  const favIsHome = g.spreadTeamId === g.homeTeamId;
  const favName = favIsHome ? g.home : g.away;
  return `${favName} -${Math.abs(g.spreadValue)}`;
}

export function signedSpreadForTeam(g: PickGame, team: 'home' | 'away'): string {
  if (g.spreadValue == null) return '';
  if (g.spreadValue === 0) return ' PK';
  const favIsHome = g.spreadTeamId === g.homeTeamId;
  const teamIsFav = (team === 'home') === favIsHome;
  return ` ${teamIsFav ? '-' : '+'}${Math.abs(g.spreadValue)}`;
}

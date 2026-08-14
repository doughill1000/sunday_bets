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

/**
 * The minimum shape the ADR-0007 line convention needs in order to be printed: the two team
 * short names, the home team's id, and the posted line. `PickGame` satisfies it structurally,
 * and so does `/week`'s `WeeklyGameBreakdown` (#836) — so both surfaces render the convention
 * through one implementation instead of each re-deriving favorite/underdog, and neither can
 * reach for the sign of `spreadValue` to do it (the #734 inversion).
 */
export type SpreadShape = {
  home: string;
  away: string;
  homeTeamId: number | null;
  spreadTeamId: number | null;
  spreadValue: number | null;
};

export function spreadLine(g: SpreadShape): string {
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

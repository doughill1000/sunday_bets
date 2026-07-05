// Spread display helpers — direct port of the web app's src/lib/domain/spread.ts.
import type { PickGame, TeamSide } from './types';

/**
 * The favorite side ('home' | 'away') for a game, or `null` when there is no line
 * (`spreadValue == null`) or it's a pick'em (`spreadValue === 0`).
 */
export function favoriteSide(g: PickGame): TeamSide | null {
  if (g.spreadValue == null || g.spreadValue === 0) return null;
  return g.spreadTeamId === g.homeTeamId ? 'home' : 'away';
}

export function spreadLine(g: PickGame): string {
  if (g.spreadValue == null) return 'No line';
  if (g.spreadValue === 0) return 'PK';
  const favIsHome = g.spreadTeamId === g.homeTeamId;
  const favName = favIsHome ? g.home : g.away;
  return `${favName} -${Math.abs(g.spreadValue)}`;
}

export function signedSpreadForTeam(g: PickGame, team: TeamSide): string {
  if (g.spreadValue == null) return '';
  if (g.spreadValue === 0) return ' PK';
  const favIsHome = g.spreadTeamId === g.homeTeamId;
  const teamIsFav = (team === 'home') === favIsHome;
  return ` ${teamIsFav ? '-' : '+'}${Math.abs(g.spreadValue)}`;
}

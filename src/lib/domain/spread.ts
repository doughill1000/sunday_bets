import type { PickGame } from '$lib/types/games';

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

// Pick-card ATS trend nugget (issue #406 PR 2): picks the one situational quadrant that
// matches a game for a given team and formats it, e.g. "6-2 ATS as home favorite".
//
// Pure and framework-free so the quadrant-selection logic is unit-tested in isolation. The
// data comes from getLeagueSituational() (the league_ats_situational view over the shared
// league_ats_base matview); this module only indexes and reads it — no cover math lives here.

import type { PickGame } from '$lib/types/games';
import type { LeagueSituationalRecord } from '$lib/types/server/league';

/**
 * Minimum quadrant sample size to show a nugget. ATS splits are noisy; below this the record
 * (e.g. 1-1) reads as false signal, so we omit it rather than mislead. A single NFL season
 * gives a team only a handful of games per quadrant, so this is deliberately low.
 */
export const MIN_NUGGET_SAMPLE = 4;

export type NuggetSide = 'home' | 'away';

/** Lookup key for a situational record: teamId | isHome | isFavorite. */
export function situationalKey(teamId: number, isHome: boolean, isFavorite: boolean): string {
  return `${teamId}:${isHome}:${isFavorite}`;
}

/** Index situational rows for O(1) quadrant lookup by the picks board. */
export function buildSituationalLookup(
  rows: LeagueSituationalRecord[]
): Map<string, LeagueSituationalRecord> {
  return new Map(rows.map((r) => [situationalKey(r.teamId, r.isHome, r.isFavorite), r]));
}

export type Nugget = {
  /** e.g. "6-2 ATS as home favorite" (record excludes pushes unless there are any). */
  text: string;
  /** Sample size for this quadrant, rendered as "(n=…)". */
  games: number;
};

/**
 * The situational nugget for one side of a game, or `null` when it can't or shouldn't render:
 * a pick'em / no-line game (no favorite quadrant), an unknown team id, a quadrant with no data,
 * or a sample below `minSample`. `is_home` is fixed by the schedule; `is_favorite` comes from
 * this game's current line (the same spread the card already shows).
 */
export function nuggetForSide(
  game: PickGame,
  side: NuggetSide,
  lookup: Map<string, LeagueSituationalRecord>,
  minSample: number = MIN_NUGGET_SAMPLE
): Nugget | null {
  // No line or pick'em → neither team has a favorite/underdog quadrant.
  if (game.spreadValue == null || game.spreadValue === 0) return null;

  const teamId = side === 'home' ? game.homeTeamId : game.awayTeamId;
  if (teamId == null) return null;

  const isHome = side === 'home';
  const favIsHome = game.spreadTeamId === game.homeTeamId;
  const isFavorite = isHome ? favIsHome : !favIsHome;

  const record = lookup.get(situationalKey(teamId, isHome, isFavorite));
  if (!record || record.games < minSample) return null;

  const { wins, losses, pushes } = record.ats;
  const recordText = pushes > 0 ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`;
  const role = `${isHome ? 'home' : 'away'} ${isFavorite ? 'favorite' : 'underdog'}`;
  return { text: `${recordText} ATS as ${role}`, games: record.games };
}

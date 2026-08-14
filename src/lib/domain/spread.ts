import type { PickGame } from '$lib/types/games';
import type { TeamSide } from '$lib/types/domain';
import { atsMarginAtLock } from './liveCover';

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

/**
 * `SpreadShape` plus everything needed to settle the game against that line: the away team's
 * id (the home id already rides on `SpreadShape`) and both scores. `/week`'s
 * `WeeklyGameBreakdown` satisfies it once a score exists — live or final.
 */
export type GameCoverShape = SpreadShape & {
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

/** Which side beat the number, and by how much. */
export type GameCover = {
  /** The covering side, or `null` on a push (the game landed exactly on the number). */
  side: TeamSide | null;
  /** Short name of the covering team; `null` on a push. */
  team: string | null;
  /** Points of daylight over the number. Always non-negative; `0` only on a push. */
  by: number;
};

/**
 * How a game finished **against its own posted line** (#838) — the fact every other element on
 * a `/week` card is downstream of but none of them states. `null` when it cannot be settled:
 * no line (an unlined game was never pickable, #802/#803), no score yet, or a missing team id.
 *
 * The margin comes from `atsMarginAtLock`, the same mirror of `public.ats_margin_at_lock` the
 * live cover dots use, so favorite/underdog is read from `spreadTeamId`'s identity and never
 * from the sign of `spreadValue` (the #734 inversion). A pick'em (`spreadValue === 0`) falls
 * out correctly on its own: the adjustment is zero, so the straight-up winner covers and a tie
 * is a push.
 *
 * This settles the GAME's line, which is display context — it is **not** what any member was
 * graded against. Each pick freezes its own line at lock (`WeeklyPickRow.lockedSpreadValue`),
 * so a member who locked a different number can carry a different outcome than this reports.
 * Never attach this result to a member's row.
 */
export function gameCover(g: GameCoverShape): GameCover | null {
  if (g.spreadValue == null) return null;
  if (g.homeScore == null || g.awayScore == null) return null;
  if (g.homeTeamId == null || g.awayTeamId == null) return null;

  const margin = atsMarginAtLock(
    g.homeScore,
    g.awayScore,
    g.homeTeamId,
    g.awayTeamId,
    g.spreadTeamId,
    g.spreadValue
  );

  if (margin === 0) return { side: null, team: null, by: 0 };
  return margin > 0
    ? { side: 'home', team: g.home, by: margin }
    : { side: 'away', team: g.away, by: -margin };
}

export function signedSpreadForTeam(g: PickGame, team: 'home' | 'away'): string {
  if (g.spreadValue == null) return '';
  if (g.spreadValue === 0) return ' PK';
  const favIsHome = g.spreadTeamId === g.homeTeamId;
  const teamIsFav = (team === 'home') === favIsHome;
  return ` ${teamIsFav ? '-' : '+'}${Math.abs(g.spreadValue)}`;
}

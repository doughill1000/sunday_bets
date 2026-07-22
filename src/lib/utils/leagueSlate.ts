// Forward-looking League slate assembly (issue #429): turns the upcoming week's games plus
// the season's situational ATS rows into slate rows, each side annotated with the one
// quadrant that matches this game's current line.
//
// Pure and framework-free so the upcoming-game selection + quadrant lookup is unit-tested in
// isolation. It reuses `nuggetForSide` (the same logic the pick-card nugget uses), so the
// slate and the picks board never format the situational split two ways.

import type { PickGame } from '$lib/types/games';
import type { LeagueSituationalRecord, LeagueSlateGame } from '$lib/types/server/league';
import { buildSituationalLookup, nuggetForSide } from './leagueNugget';

/** A team's division identity for the slate's divisional tag: `"<conference> <division>"`
 *  (e.g. "AFC North"). Teams with a null conference or division are absent from the map, so a
 *  matchup involving one can never be marked divisional. */
export type TeamDivisionLookup = Map<number, string>;

/**
 * Build the slate rows for the upcoming scoring week: only games whose kickoff is still in
 * the future (the pickable cards on `/picks`, which expose a `#game-<id>` deep-link anchor —
 * started/graded games do not), soonest first, each side carrying its matching situational
 * nugget (or `null` for a pick'em / no-line / thin-sample side). `nowMs` is injected so the
 * "upcoming" cut is deterministic in tests. `divisions` marks same-conference-and-division
 * matchups (#692) — the same rule `league_ats_divisional` uses.
 */
export function buildSlateGames(
  games: PickGame[],
  situational: LeagueSituationalRecord[],
  nowMs: number,
  divisions: TeamDivisionLookup = new Map()
): LeagueSlateGame[] {
  const lookup = buildSituationalLookup(situational);
  return games
    .filter((g) => new Date(g.kickoff).getTime() > nowMs)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .map((g) => ({
      gameId: g.id,
      kickoff: g.kickoff,
      isDivisional:
        g.homeTeamId != null &&
        g.awayTeamId != null &&
        divisions.has(g.homeTeamId) &&
        divisions.get(g.homeTeamId) === divisions.get(g.awayTeamId),
      away: { label: g.away, nugget: nuggetForSide(g, 'away', lookup) },
      home: { label: g.home, nugget: nuggetForSide(g, 'home', lookup) }
    }));
}

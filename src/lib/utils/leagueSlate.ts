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

/**
 * Build the slate rows for the upcoming scoring week: only games whose kickoff is still in
 * the future (the pickable cards on `/picks`, which expose a `#game-<id>` deep-link anchor —
 * started/graded games do not), soonest first, each side carrying its matching situational
 * nugget (or `null` for a pick'em / no-line / thin-sample side). `nowMs` is injected so the
 * "upcoming" cut is deterministic in tests.
 */
export function buildSlateGames(
  games: PickGame[],
  situational: LeagueSituationalRecord[],
  nowMs: number
): LeagueSlateGame[] {
  const lookup = buildSituationalLookup(situational);
  return games
    .filter((g) => new Date(g.kickoff).getTime() > nowMs)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .map((g) => ({
      gameId: g.id,
      kickoff: g.kickoff,
      away: { label: g.away, nugget: nuggetForSide(g, 'away', lookup) },
      home: { label: g.home, nugget: nuggetForSide(g, 'home', lookup) }
    }));
}

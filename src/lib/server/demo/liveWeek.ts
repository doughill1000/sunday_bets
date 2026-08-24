// Reshaping the frozen `DemoLiveWeek` into the shapes the real /week components read (#833).
//
// The demo's sweat showcase moved from `/demo` to `/demo/week` when #832 made kickoff the
// boundary between the picking board and the live board. `/demo/week` therefore needs the same
// `WeeklyGameBreakdown[]` the authed /week loads from `getGroupPicks`, and the snapshot carries
// only the raw `DemoLiveGame[]` (ADR-0026 keeps the fixture to one representation per fact —
// the pre-assembled `standings` exist because they are not derivable from the games alone;
// the breakdown is).
//
// Both the snapshot GENERATOR and the `/demo/week` loader call `demoWeeklyBreakdown`, so the
// standings baked into the fixture and the cards rendered beside them can never be assembled
// two different ways.
import { assembleWeeklyBreakdown, type GameInputRow } from '$lib/utils/weeklyPicks';
import type { DemoLiveGame } from '$lib/types/demo';
import type { GroupMember } from '$lib/types/group';
import type { LeaderboardPlayer, WeeklyGameBreakdown } from '$lib/types/leaderboard';
import type { LiveScoreEntry } from '$lib/live/types';

/** Stable, deterministic member order so the generated fixture is byte-reproducible. */
export function demoPlayers(members: GroupMember[]): LeaderboardPlayer[] {
  return [...members]
    .sort((a, b) => a.userId.localeCompare(b.userId))
    .map((m) => ({ id: m.userId, display_name: m.displayName, avatar_key: m.avatarKey }));
}

/** The frozen live/unofficial scores, keyed by game id — the demo's stand-in for `/api/live-scores`. */
export function demoLiveScores(games: DemoLiveGame[]): Record<string, LiveScoreEntry> {
  const scores: Record<string, LiveScoreEntry> = {};
  for (const g of games) if (g.liveScore) scores[g.id] = g.liveScore;
  return scores;
}

/**
 * The demo week's per-game × per-member grid, assembled through the shipped `#584` path.
 *
 * `final_scores` stays `null` on every game, including the `final_unofficial` one: that game is
 * final on the *feed* but ungraded, which is exactly the state `WeeklyPickCard` renders as
 * "Final · unofficial" from the live score. Passing it as a settled final would claim a grade
 * the demo has no settlement for.
 *
 * The game's line is carried across from the `PickGame` as a synthetic active-line row so the
 * demo cards print the same "what were these picks against" header the real /week does (#836).
 * It is the GAME's line only — never attached to a member's row, whose own frozen line rides on
 * `GroupPickEntry.lockedSpreadValue`.
 */
export function demoWeeklyBreakdown(
  games: DemoLiveGame[],
  members: GroupMember[],
  personaId: string
): WeeklyGameBreakdown[] {
  const rows: GameInputRow[] = games.map((g) => ({
    id: g.id,
    commence_time: g.kickoff,
    final_scores: null,
    home_team_id: g.homeTeamId,
    away_team_id: g.awayTeamId,
    home: { short_name: g.home },
    away: { short_name: g.away },
    game_lines:
      g.spreadTeamId == null || g.spreadValue == null
        ? null
        : [
            {
              spread_team_id: g.spreadTeamId,
              spread_value: g.spreadValue,
              source: 'fanduel',
              is_closing_line: false,
              is_active_line: true,
              fetched_at: g.kickoff
            }
          ]
  }));

  return assembleWeeklyBreakdown(
    rows,
    games.flatMap((g) => g.groupPicks),
    [],
    demoPlayers(members),
    personaId
  );
}

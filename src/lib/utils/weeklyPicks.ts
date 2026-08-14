import type {
  WeeklyGameBreakdown,
  WeeklyPickRow,
  WeeklyLiveStanding,
  LeaderboardPlayer,
  Settlement
} from '$lib/types/leaderboard';
import type { GroupPickEntry } from '$lib/types/picks';
import { liveCoverState, weekSoFarPoints, type WeekSoFarPick } from '$lib/domain/liveCover';
import { isWithinParticipation } from '$lib/domain/participation';
import type { LiveScoreEntry } from '$lib/live/types';

export type GameLineRow = {
  spread_team_id: number | null;
  spread_value: number | null;
  source: string | null;
  is_closing_line: boolean;
  is_active_line: boolean;
  fetched_at: string | null;
};

export type GameInputRow = {
  id: string;
  commence_time: string;
  final_scores: { home: number; away: number } | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home: { short_name: string } | null;
  away: { short_name: string } | null;
  /** Closing/active line rows only — see `getGamesForWeeksWithScores`. Optional so older
   *  callers and fixtures that don't care about the line stay valid. */
  game_lines?: GameLineRow[] | null;
};

/**
 * The one line to show for a game on the /week card (#836).
 *
 * 1. the `is_closing_line` row where one is flagged — the last pre-kickoff line, captured
 *    write-once at first grade (#735), and the right number for a settled week;
 * 2. otherwise the `is_active_line` row, which covers an in-progress or ungraded week;
 * 3. otherwise `null` — the game carries no line and the header renders unchanged, because an
 *    unlined game was never pickable (#802/#803) and a placeholder there would read as an error.
 *
 * `fanduel` breaks a tie inside a tier, mirroring `league_ats_base` and grading's own
 * `coalesce(cfg.line_source, 'fanduel')` so the whole app reads one book. That tie is only
 * reachable for closing lines — `is_active_line` is unique per game, while `is_closing_line` is
 * unique per game *and source* — but leaving the order to the database would let the number on
 * the card change between loads.
 *
 * Context only: this is the *game's* line, never the per-pick line a member was graded against
 * (each pick freezes its own at lock time, `picks.locked_spread_value`), so nothing downstream
 * may attach it to a member's row.
 */
export function selectGameLine(lines: GameLineRow[] | null | undefined): GameLineRow | null {
  const usable = (lines ?? []).filter((l) => l.is_closing_line || l.is_active_line);
  if (usable.length === 0) return null;
  return usable.toSorted(
    (a, b) =>
      Number(b.is_closing_line) - Number(a.is_closing_line) ||
      Number(b.source === 'fanduel') - Number(a.source === 'fanduel') ||
      (b.fetched_at ?? '').localeCompare(a.fetched_at ?? '')
  )[0];
}

/**
 * The Weekly tab's per-game × per-member grid.
 *
 * `outcome` prefers the graded `pick_settlement` row; before the grade cron settles a final
 * game it falls back to synthesising `'missed'` for a member with no pick, so the grid is not
 * blank for the hours between the final whistle and grading.
 *
 * That fallback is the one place this read surface can manufacture an obligation grading never
 * wrote, so it carries the ADR-0037 participation boundary (#724): a game that kicked off
 * before a member joined — or before their league's competition started — is not theirs to
 * miss, and reads as a neutral blank rather than a red `missed`. A graded row always wins, so
 * a genuine pre-removal history (ADR-0037 ruling 6) still displays.
 */
export function assembleWeeklyBreakdown(
  games: GameInputRow[],
  groupPicks: GroupPickEntry[],
  settlements: Settlement[],
  players: LeaderboardPlayer[],
  currentUserId: string | null
): WeeklyGameBreakdown[] {
  const picksByGameUser = new Map<string, GroupPickEntry>();
  for (const pick of groupPicks) {
    picksByGameUser.set(`${pick.gameId}:${pick.userId}`, pick);
  }

  const settlementsByGameUser = new Map<string, Settlement>();
  for (const s of settlements) {
    settlementsByGameUser.set(`${s.game_id}:${s.user_id}`, s);
  }

  return games.map((game) => {
    const scores = game.final_scores;
    const isFinal = scores != null;
    const line = selectGameLine(game.game_lines);

    const picks: WeeklyPickRow[] = players.map((player) => {
      const pick = picksByGameUser.get(`${game.id}:${player.id}`);
      const settlement = settlementsByGameUser.get(`${game.id}:${player.id}`);

      const within = isWithinParticipation(game.commence_time, player.participation_start);

      let outcome: WeeklyPickRow['outcome'] = null;
      if (settlement) {
        outcome = settlement.outcome;
      } else if (!pick && isFinal && within) {
        outcome = 'missed';
      }

      // Pre-participation (ADR-0037): the game predates this member's boundary and they have
      // neither a pick nor a graded row, so it was never theirs. Flag it so the grid shows a
      // neutral "not in yet" instead of folding them into the "No pick" list. A graded
      // settlement always wins above, so this never overrides real history.
      const notParticipating = !settlement && !pick && !within;

      return {
        userId: player.id,
        displayName: player.display_name,
        avatarKey: player.avatar_key ?? null,
        isYou: player.id === currentUserId,
        pickedSide: pick?.pickedSide ?? null,
        pickedTeamShort: pick?.pickedTeamShort ?? null,
        weight: pick?.weight ?? null,
        outcome,
        notParticipating,
        pointsDelta: settlement?.points_delta ?? null,
        // Frozen-at-lock inputs for the display-only live cover mirror (#584).
        pickedTeamId: pick?.pickedTeamId ?? null,
        lockedSpreadValue: pick?.lockedSpreadValue ?? null,
        lockedSpreadTeamId: pick?.lockedSpreadTeamId ?? null
      };
    });

    return {
      gameId: game.id,
      away: game.away?.short_name ?? '',
      home: game.home?.short_name ?? '',
      homeScore: scores?.home ?? null,
      awayScore: scores?.away ?? null,
      kickoff: game.commence_time,
      isFinal,
      homeTeamId: game.home_team_id,
      awayTeamId: game.away_team_id,
      spreadTeamId: line?.spread_team_id ?? null,
      spreadValue: line?.spread_value ?? null,
      picks
    };
  });
}

/**
 * Rank every player by their live week-so-far points for the Weekly-tab sweat board (#584).
 * Display-only: for each of a member's picks it uses the graded `points_delta` where the grade
 * cron has already settled it (authoritative, and it already carries any missed-pick penalty),
 * and otherwise projects a provisional verdict from the live ESPN score via `liveCoverState` —
 * the same TS mirror of `grade_pick` #386 introduced — summed through the shared
 * `weekSoFarPoints`. Because graded games always win over the live projection, the board
 * converges to exactly the graded weekly order once every game settles ("yields to graded").
 *
 * `liveScores` is keyed by our game id; pass an empty map (or omit) to get the pure graded
 * standing (e.g. a fully-settled past week, or while the feed is stale and we stop asserting a
 * live number). Never a settlement authority — grading stays canonical.
 */
export function assembleWeeklyLiveStandings(
  breakdown: WeeklyGameBreakdown[],
  liveScores: Record<string, LiveScoreEntry> = {}
): WeeklyLiveStanding[] {
  type Acc = {
    userId: string;
    displayName: string;
    avatarKey: string | null;
    isYou: boolean;
    gradedPoints: number;
    livePicks: WeekSoFarPick[];
    decided: number;
    pickCount: number;
    hasLive: boolean;
  };
  const byUser = new Map<string, Acc>();

  for (const game of breakdown) {
    const live = liveScores[game.gameId];
    for (const row of game.picks) {
      let acc = byUser.get(row.userId);
      if (!acc) {
        acc = {
          userId: row.userId,
          displayName: row.displayName,
          avatarKey: row.avatarKey,
          isYou: row.isYou,
          gradedPoints: 0,
          livePicks: [],
          decided: 0,
          pickCount: 0,
          hasLive: false
        };
        byUser.set(row.userId, acc);
      }

      const hasPick = row.pickedSide != null;
      if (hasPick) acc.pickCount++;

      // Graded wins: the settled points_delta is authoritative (and already includes any
      // missed-pick penalty). A graded row is decided and no longer "live".
      if (row.pointsDelta != null) {
        acc.gradedPoints += row.pointsDelta;
        acc.decided++;
        continue;
      }

      // Otherwise project the provisional verdict from the live score, exactly as grade_pick
      // would evaluate it — display-only, superseded the moment the grade cron settles it.
      if (hasPick && live) {
        const state = liveCoverState({
          homeScore: live.homeScore,
          awayScore: live.awayScore,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          pickedTeamId: row.pickedTeamId,
          lockedSpreadTeamId: row.lockedSpreadTeamId,
          lockedSpreadValue: row.lockedSpreadValue
        });
        if (state) {
          acc.livePicks.push({ weight: row.weight, verdict: state.verdict });
          acc.decided++;
          acc.hasLive = true;
        }
      }
    }
  }

  const standings: WeeklyLiveStanding[] = [...byUser.values()].map((a) => ({
    userId: a.userId,
    displayName: a.displayName,
    avatarKey: a.avatarKey,
    isYou: a.isYou,
    points: a.gradedPoints + weekSoFarPoints(a.livePicks),
    decided: a.decided,
    pickCount: a.pickCount,
    hasLive: a.hasLive,
    rank: 0
  }));

  // Most points first, then name for a stable order; the keyed {#each} + svelte flip animates
  // the reshuffle as covers flip.
  standings.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));

  // Competition ranking: tied totals share a rank; the next distinct total skips ahead.
  let lastPoints: number | null = null;
  let lastRank = 0;
  standings.forEach((s, i) => {
    if (lastPoints === null || s.points !== lastPoints) {
      lastRank = i + 1;
      lastPoints = s.points;
    }
    s.rank = lastRank;
  });

  return standings;
}

/**
 * Orders the Weekly tab's game cards so the games actually in play lead the board — above
 * every already-final and not-yet-started game (#831). At 4:40pm on a Sunday the finished 1pm
 * games sat above the 4:25s actually deciding the week; at 390px that was the entire first
 * screen.
 *
 * Stable sort on `(isLive ? 0 : 1)`, then kickoff ascending. `liveScores` is expected to already
 * be gated to the live window (`activeLiveScores`, #822) rather than carrying a separate mode
 * flag: outside the window every game reads not-live here, so this collapses to exactly today's
 * kickoff order with no special-casing — the zero-live regression the acceptance criteria call
 * out.
 */
export function orderWeeklyBreakdown(
  breakdown: WeeklyGameBreakdown[],
  liveScores: Record<string, LiveScoreEntry> = {}
): WeeklyGameBreakdown[] {
  return [...breakdown].sort((a, b) => {
    const aRank = liveScores[a.gameId]?.status === 'in_progress' ? 0 : 1;
    const bRank = liveScores[b.gameId]?.status === 'in_progress' ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return Date.parse(a.kickoff) - Date.parse(b.kickoff);
  });
}

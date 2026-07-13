// Server side of the live Sunday sweat board (issue #386).
//
// A self-gated, display-only pass-through over the ESPN scoreboard we already use for
// schedule sync. It hits ESPN ONLY when an active-week game is inside its live window, maps
// live/final scores onto our game ids via the already-populated `games.schedule_game_id`,
// and returns them with the honest `fetchedAt` of the last real fetch. There is NO
// persistence and NO new cron: grading (the grade cron) stays the sole settlement
// authority, and this never writes a thing.
//
// A short module-level memo (`LIVE_CACHE_TTL_MS`) plus the endpoint's `s-maxage` collapse
// all concurrent viewers to ≤1 ESPN fetch per window regardless of headcount — the
// goodwill property the triage comment on #386 called for, with zero DB.
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { fetchEspnWeek, EspnFetchError, EspnParseError, type EspnGame } from './schedule';
import { isWithinLiveWindow } from '$lib/live/config';
import type { LiveScoreEntry, LiveScoresPayload } from '$lib/live/types';

export type { LiveScoreEntry, LiveScoresPayload } from '$lib/live/types';

// Slightly under the endpoint's `s-maxage=20` so a warm Fluid Compute instance dedups ESPN
// fetches even when the CDN cache is bypassed (e.g. an auth cookie refresh on the response).
const LIVE_CACHE_TTL_MS = 15_000;

const EMPTY: LiveScoresPayload = { scores: {}, fetchedAt: null };

/** One active-week game reduced to what the live selection needs. */
export type WeekGameForLive = {
  id: string;
  scheduleGameId: string | null;
  commenceTimeMs: number;
};

/**
 * Pure join of ESPN games onto our week games, gated to the live window. Split out so the
 * gating rules are unit-testable without a DB or network:
 *  - a game with a null `scheduleGameId` yields no live state (the #386 null-guard);
 *  - a game outside its live window is dropped, so a graded result supersedes it once the
 *    grade cron has run (the "yields to graded" guarantee);
 *  - only `in_progress` / `final` ESPN games with both scores present are surfaced.
 */
export function selectLiveScores(
  weekGames: WeekGameForLive[],
  espnGames: EspnGame[],
  now: number
): Record<string, LiveScoreEntry> {
  const idByScheduleId = new Map<string, string>();
  for (const g of weekGames) {
    if (g.scheduleGameId && isWithinLiveWindow(g.commenceTimeMs, now)) {
      idByScheduleId.set(g.scheduleGameId, g.id);
    }
  }

  const scores: Record<string, LiveScoreEntry> = {};
  for (const eg of espnGames) {
    const gameId = idByScheduleId.get(eg.scheduleGameId);
    if (!gameId) continue;
    if (eg.status !== 'in_progress' && eg.status !== 'final') continue;
    if (eg.homeScore == null || eg.awayScore == null) continue;
    scores[gameId] = {
      homeScore: eg.homeScore,
      awayScore: eg.awayScore,
      status: eg.status,
      displayClock: eg.displayClock,
      period: eg.period
    };
  }
  return scores;
}

let memo: { at: number; payload: LiveScoresPayload } | null = null;

/** Testing seam: drop the module memo between cases. */
export function __resetLiveScoresCache(): void {
  memo = null;
}

/**
 * The active week's live scores, self-gated and memoized. Never throws for an ESPN failure —
 * it degrades to `EMPTY` (`fetchedAt: null`) so the board reconnects rather than erroring.
 */
export async function getLiveScoresForActiveWeek(now = Date.now()): Promise<LiveScoresPayload> {
  if (memo && now - memo.at < LIVE_CACHE_TTL_MS) return memo.payload;
  const payload = await computeLiveScores(now);
  memo = { at: now, payload };
  return payload;
}

async function computeLiveScores(now: number): Promise<LiveScoresPayload> {
  const week = await findActiveWeek();
  if (!week) return EMPTY;

  const { data: games, error } = await supabaseService
    .from('games')
    .select('id, schedule_game_id, commence_time')
    .eq('week_id', week.id);
  if (error) throw error;

  const weekGames: WeekGameForLive[] = (games ?? []).map((g) => ({
    id: g.id,
    scheduleGameId: g.schedule_game_id,
    commenceTimeMs: new Date(g.commence_time).getTime()
  }));

  // Self-gate: no game in a live window → don't touch ESPN at all.
  const anyLive = weekGames.some(
    (g) => g.scheduleGameId && isWithinLiveWindow(g.commenceTimeMs, now)
  );
  if (!anyLive) return EMPTY;

  const { data: season } = await supabaseService
    .from('seasons')
    .select('year')
    .eq('id', week.season_id)
    .maybeSingle();
  if (!season) return EMPTY;

  // Recover the ESPN coordinates the same way schedule sync stored them: preseason weeks are
  // held as a negative week_number with seasontype=1 (ADR-0016); regular weeks are positive.
  const seasonType: 1 | 2 = week.week_number < 0 ? 1 : 2;
  const espnWeek = Math.abs(week.week_number);

  let result;
  try {
    result = await fetchEspnWeek(season.year, espnWeek, seasonType);
  } catch (err) {
    if (err instanceof EspnFetchError || err instanceof EspnParseError) {
      // Non-fatal: the same posture schedule sync takes. The board shows Stale · reconnecting.
      Sentry.captureException(err);
      return EMPTY;
    }
    throw err;
  }

  const scores = selectLiveScores(weekGames, result.games, now);
  return { scores, fetchedAt: new Date(now).toISOString() };
}

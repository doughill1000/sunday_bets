// src/lib/server/services/grading.ts
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { type OddsScore } from '$lib/types/oddsApi';
import { fetchNFLScores } from '$lib/server/odds';
import { fetchEspnWeek, type EspnGame } from '$lib/server/schedule';
import { findTeamsByExternalKeys } from '$lib/server/db/queries/findTeamsByExternalKeys';

/**
 * Refresh the materialized leaderboard/stats views after a grading run (issue #191).
 * The leaderboard and stats pages read these matviews, which only change during grading,
 * so we recompute them here instead of on every page load.
 *
 * A refresh failure is logged but never thrown: the grade has already committed, the
 * leaderboard simply shows the prior snapshot, and the next grade self-heals it. Keeping
 * this off the grade's critical path is deliberate — a transient refresh error must not
 * abort or roll back grading.
 */
export async function refreshLeaderboardStats(): Promise<void> {
  const { error } = await supabaseService.rpc('refresh_leaderboard_stats');
  if (error) {
    Sentry.captureException(error, {
      tags: { area: 'grading', step: 'refresh_leaderboard_stats' }
    });
    console.error(
      'refresh_leaderboard_stats failed (leaderboard/stats may be stale):',
      error.message
    );
  }
}

/** Result summary shared by all three graders — powers the admin card's confirmation note. */
export type GradeSummary = {
  /** Games in the target set that actually had a final (i.e. were gradeable). */
  gamesGraded: number;
  /** Real member picks settled across all groups (excludes auto "missed" penalties). */
  picksSettled: number;
};

/**
 * Count what a grade run actually settled, so the UI can say "N games, M picks
 * settled" instead of a bare "done". Derived from the same game-id set the grader
 * processed: `gamesGraded` counts those with a final present (what grade_* grades),
 * `picksSettled` counts pick_settlement rows tied to a real pick (pick_id not null).
 */
async function summarizeGrade(gameIds: string[]): Promise<GradeSummary> {
  if (gameIds.length === 0) return { gamesGraded: 0, picksSettled: 0 };

  // Non-fatal: the grade has already committed by the time we count. If the summary
  // queries hiccup (e.g. a very long id list), fall back to zeros — the caller's UI
  // shows a plain "Graded" note rather than surfacing a false error over a real grade.
  try {
    const [{ count: gamesGraded }, { count: picksSettled }] = await Promise.all([
      supabaseService
        .from('games')
        .select('id', { count: 'exact', head: true })
        .in('id', gameIds)
        .not('final_scores', 'is', null),
      supabaseService
        .from('pick_settlement')
        .select('pick_id', { count: 'exact', head: true })
        .in('game_id', gameIds)
        .not('pick_id', 'is', null)
    ]);

    return { gamesGraded: gamesGraded ?? 0, picksSettled: picksSettled ?? 0 };
  } catch {
    return { gamesGraded: 0, picksSettled: 0 };
  }
}

async function gameIdsForWeek(weekId: number): Promise<string[]> {
  const { data, error } = await supabaseService.from('games').select('id').eq('week_id', weekId);
  if (error) throw new Error(error.message);
  return data?.map((g) => g.id) ?? [];
}

async function gameIdsForSeason(seasonId: number): Promise<string[]> {
  // PostgREST can't do a subselect in .in(), so resolve the week ids first.
  const { data: weeks, error: wErr } = await supabaseService
    .from('weeks')
    .select('id')
    .eq('season_id', seasonId);
  if (wErr) throw new Error(wErr.message);
  const weekIds = weeks?.map((w) => w.id) ?? [];
  if (weekIds.length === 0) return [];

  const { data: games, error: gErr } = await supabaseService
    .from('games')
    .select('id')
    .in('week_id', weekIds);
  if (gErr) throw new Error(gErr.message);
  return games?.map((g) => g.id) ?? [];
}

/** Grade a single game. Optionally refresh finals (ESPN-first, Odds fallback) first. */
export async function gradeGame(
  gameId: string,
  opts?: { refreshScores?: boolean; daysFrom?: number }
) {
  if (opts?.refreshScores) {
    await refreshScoresForGames([gameId], opts.daysFrom ?? 1);
  }
  const { error } = await supabaseService.rpc('grade_game', { p_game_id: gameId });
  if (error) throw new Error(error.message);
  await refreshLeaderboardStats();
  const summary = await summarizeGrade([gameId]);
  return { ok: true, game_id: gameId, ...summary };
}

/** Grade a week. Optionally pull finals for the week before grading. */
export async function gradeWeek(
  weekId: number,
  opts?: { refreshScores?: boolean; daysFrom?: number }
) {
  const gameIds = await gameIdsForWeek(weekId);
  if (opts?.refreshScores) {
    await refreshScoresForGames(gameIds, opts?.daysFrom ?? 1);
  }
  const { error } = await supabaseService.rpc('grade_week', { p_week_id: weekId });
  if (error) throw new Error(error.message);
  await refreshLeaderboardStats();
  const summary = await summarizeGrade(gameIds);
  return { ok: true, week_id: weekId, ...summary };
}

/** Grade a season. Optionally pull finals for all weeks in the season. */
export async function gradeSeason(
  seasonId: number,
  opts?: { refreshScores?: boolean; daysFrom?: number }
) {
  const gameIds = await gameIdsForSeason(seasonId);
  if (opts?.refreshScores) {
    await refreshScoresForGames(gameIds, opts?.daysFrom ?? 3);
  }
  const { error } = await supabaseService.rpc('grade_season', { p_season_id: seasonId });
  if (error) throw new Error(error.message);
  await refreshLeaderboardStats();
  const summary = await summarizeGrade(gameIds);
  return { ok: true, season_id: seasonId, ...summary };
}

// The score-refresh target row: the matchup identity (ADR-0003) plus the ESPN
// scoreboard coordinates (season year + week_number) and the Odds-fallback keys.
type TargetGame = {
  id: string;
  external_game_id: string | null;
  home_team_id: number;
  away_team_id: number;
  home_team: { name: string; short_name: string } | null;
  away_team: { name: string; short_name: string } | null;
  week: { week_number: number; season: { year: number } | null } | null;
};

// Translate our stored week_number into the ESPN scoreboard's (week, seasontype).
// Preseason weeks are stored negative (scheduleSync: weekNumber = -espnWeek, seasontype 1);
// regular weeks keep their positive number under seasontype 2.
function espnWeekCoords(weekNumber: number): { espnWeek: number; seasonType: 1 | 2 } {
  return weekNumber < 0
    ? { espnWeek: -weekNumber, seasonType: 1 }
    : { espnWeek: weekNumber, seasonType: 2 };
}

/**
 * Persist finals into games.final_scores for the specified game IDs.
 *
 * ESPN scoreboard is the primary source (ADR-0025): finals are matched to games by the
 * ADR-0003 matchup identity (week_id, home_team_id, away_team_id) with home/away taken
 * from ESPN's explicit `homeAway`, so there is no name fuzzing and no `daysFrom` window
 * — late grades, re-grades, and backfills all use the same path.
 *
 * The Odds API `/scores` path is retained as a per-game fallback (provider independence):
 * a game ESPN has not marked complete, or an ESPN fetch/parse failure, falls back to Odds
 * for that game only, never blocking the rest of the grade.
 */
async function refreshScoresForGames(gameIds: string[], daysFrom: number) {
  if (gameIds.length === 0) return;

  const { data, error: gErr } = await supabaseService
    .from('games')
    .select(
      `
      id,
      external_game_id,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(name, short_name),
      away_team:teams!games_away_team_id_fkey(name, short_name),
      week:weeks(week_number, season:seasons(year))
    `
    )
    .in('id', gameIds);

  if (gErr) throw new Error(gErr.message);
  const targetGames = (data ?? []) as unknown as TargetGame[];
  if (targetGames.length === 0) return;

  // ESPN abbreviations normalize to teams.external_key; map those to team ids so ESPN
  // finals attach by matchup identity rather than by fuzzy team-name matching.
  const teams = await findTeamsByExternalKeys();
  const teamIdByKey = new Map(teams.map((t) => [t.external_key, t.id] as const));

  const finals = new Map<string, { home: number; away: number }>();
  const espnMisses: TargetGame[] = [];

  // Group targets by ESPN scoreboard coordinates so each distinct week is fetched once.
  const byWeek = new Map<string, TargetGame[]>();
  for (const g of targetGames) {
    const year = g.week?.season?.year;
    const weekNumber = g.week?.week_number;
    if (year == null || weekNumber == null) {
      // No schedule coordinates to query ESPN with — try the Odds fallback for it.
      espnMisses.push(g);
      continue;
    }
    const key = `${year}:${weekNumber}`;
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(g);
    else byWeek.set(key, [g]);
  }

  for (const [key, group] of byWeek) {
    const [yearStr, weekStr] = key.split(':');
    const { espnWeek, seasonType } = espnWeekCoords(Number(weekStr));

    let espnGames: EspnGame[];
    try {
      const res = await fetchEspnWeek(Number(yearStr), espnWeek, seasonType, { retainRaw: true });
      espnGames = res.games;
    } catch (err) {
      // ESPN fetch/parse failure is a non-fatal miss (ADR-0025): log it and fall the
      // whole week's games through to the Odds fallback rather than writing a bad final.
      Sentry.captureException(err, { tags: { area: 'grading', step: 'espn_scores' } });
      espnMisses.push(...group);
      continue;
    }

    // Index ESPN finals by our matchup identity (home_team_id, away_team_id).
    const espnByMatchup = new Map<string, EspnGame>();
    for (const eg of espnGames) {
      const homeId = teamIdByKey.get(eg.homeTeamAbbr);
      const awayId = teamIdByKey.get(eg.awayTeamAbbr);
      if (homeId == null || awayId == null) continue;
      espnByMatchup.set(`${homeId}:${awayId}`, eg);
    }

    for (const g of group) {
      const eg = espnByMatchup.get(`${g.home_team_id}:${g.away_team_id}`);
      if (eg && eg.status === 'final' && eg.homeScore != null && eg.awayScore != null) {
        finals.set(g.id, { home: eg.homeScore, away: eg.awayScore });
      } else {
        // No completed ESPN final for this game — fall back to Odds for it (per-game).
        espnMisses.push(g);
      }
    }
  }

  // Fallback: The Odds API /scores for the games ESPN could not fill. Fetched once and
  // applied per-game; a single missing final never blocks the rest of the grade.
  if (espnMisses.length > 0) {
    const scores = await fetchNFLScores(daysFrom);
    const byExternal = new Map(scores.map((s) => [s.id, s] as const));
    for (const g of espnMisses) {
      const ev = byExternal.get(g.external_game_id as string);
      if (!ev || !_isCompleted(ev)) continue;

      const { home, away } = _pickHomeAwayScores(ev, g.home_team?.name, g.away_team?.name);
      if (home == null || away == null) continue;
      finals.set(g.id, { home, away });
    }
  }

  // Persist finals sequentially (small counts).
  for (const [gameId, final_scores] of finals) {
    const { error } = await supabaseService.from('games').update({ final_scores }).eq('id', gameId);
    if (error) throw new Error(error.message);
  }
}

function _isCompleted(ev: OddsScore) {
  // Odds API exposes "completed" and/or final scores; prefer the flag when present
  if (typeof ev.completed === 'boolean') return ev.completed;
  // fallback heuristic: both teams have numeric scores and commence_time is in the past
  const bothHaveScores =
    Array.isArray(ev.scores) && ev.scores.every((s) => Number.isFinite(s.score));
  return bothHaveScores && new Date(ev.commence_time).getTime() < Date.now();
}

/**
 * Match the two numbers in Odds API `scores` back to our home/away.
 * We try exact name match first; fall back to fuzzy matches on short_name.
 * Only used on the Odds fallback path — ESPN-sourced finals key on matchup identity.
 */
function _pickHomeAwayScores(ev: OddsScore, homeName?: string | null, awayName?: string | null) {
  const scores = ev.scores ?? [];
  const nameToScore = new Map(scores.map((s) => [s.name, s.score] as const));
  // exact
  let home = homeName ? nameToScore.get(homeName) : undefined;
  let away = awayName ? nameToScore.get(awayName) : undefined;

  // fallback: sometimes book uses city names only; try contains-insensitive
  if (home == null && homeName) {
    const entry = scores.find((s) => _strEqLoose(s.name, homeName));
    if (entry) home = entry.score;
  }
  if (away == null && awayName) {
    const entry = scores.find((s) => _strEqLoose(s.name, awayName));
    if (entry) away = entry.score;
  }

  return { home: home ?? null, away: away ?? null };
}

function _strEqLoose(a: string, b: string) {
  const z = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const za = z(a),
    zb = z(b);
  return za === zb || za.includes(zb) || zb.includes(za);
}

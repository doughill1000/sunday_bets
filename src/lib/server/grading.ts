// src/lib/server/services/grading.ts
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { type OddsScore } from '$lib/types/oddsApi';
import { fetchNFLScores } from '$lib/server/odds';

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

/** Grade a single game. Optionally refresh finals from Odds API first. */
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
  return { ok: true, game_id: gameId };
}

/** Grade a week. Optionally pull finals for the week before grading. */
export async function gradeWeek(
  weekId: number,
  opts?: { refreshScores?: boolean; daysFrom?: number }
) {
  if (opts?.refreshScores) {
    const { data: games, error } = await supabaseService
      .from('games')
      .select('id')
      .eq('week_id', weekId);
    if (error) throw new Error(error.message);
    await refreshScoresForGames(games?.map((g) => g.id) ?? [], opts?.daysFrom ?? 1);
  }
  const { error } = await supabaseService.rpc('grade_week', { p_week_id: weekId });
  if (error) throw new Error(error.message);
  await refreshLeaderboardStats();
  return { ok: true, week_id: weekId };
}

/** Grade a season. Optionally pull finals for all weeks in the season. */
export async function gradeSeason(
  seasonId: number,
  opts?: { refreshScores?: boolean; daysFrom?: number }
) {
  if (opts?.refreshScores) {
    const { data: games, error } = await supabaseService
      .from('games')
      .select('id')
      .in(
        'week_id',
        // NOTE: PostgREST doesn't support subselect directly in .in(), so do two roundtrips.
        (await supabaseService.from('weeks').select('id').eq('season_id', seasonId)).data?.map(
          (w) => w.id
        ) ?? []
      );
    if (error) throw new Error(error.message);
    await refreshScoresForGames(games?.map((g) => g.id) ?? [], opts?.daysFrom ?? 1);
  }
  const { error } = await supabaseService.rpc('grade_season', { p_season_id: seasonId });
  if (error) throw new Error(error.message);
  await refreshLeaderboardStats();
  return { ok: true, season_id: seasonId };
}

/**
 * Pull scores (daysFrom) and persist finals into games.final_scores
 * for the specified game IDs only (by matching external_game_id).
 */
async function refreshScoresForGames(gameIds: string[], daysFrom: number) {
  if (gameIds.length === 0) return;

  const { data: targetGames, error: gErr } = await supabaseService
    .from('games')
    .select(
      `
      id,
      external_game_id,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(name, short_name),
      away_team:teams!games_away_team_id_fkey(name, short_name)
    `
    )
    .in('id', gameIds);

  if (gErr) throw new Error(gErr.message);
  if (!targetGames?.length) return;

  // 2) Fetch recent scores from Odds API
  const scores = await fetchNFLScores(daysFrom);

  // 3) Build map external_id -> score event
  const byExternal = new Map(scores.map((s) => [s.id, s] as const));

  // 4) For each game, if there's a completed event, persist finals
  const updates = [];
  for (const g of targetGames) {
    const ev = byExternal.get(g.external_game_id as string);
    if (!ev || !_isCompleted(ev)) continue;

    const { home, away } = _pickHomeAwayScores(ev, g.home_team?.name, g.away_team?.name);
    if (home == null || away == null) continue;

    updates.push(
      supabaseService.from('games').update({ final_scores: { home, away } }).eq('id', g.id)
    );
  }

  // 5) Run updates sequentially to keep it simple (small count)
  for (const q of updates) {
    const { error } = await q;
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

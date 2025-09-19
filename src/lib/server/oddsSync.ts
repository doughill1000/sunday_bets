// src/lib/server/oddsSync.ts
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from './odds';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { findTeamsByNames } from './db/queries/findTeamsByNames';
import { upsertGame } from './db/commands/upsert_game';
import { upsertGameByExternalId } from './db/commands/upsertGameByExternalId';
import { setActiveLine } from './db/commands/setActiveLine';

/**
 * Sync fanduel spreads for the active week.
 * - honors monthly cap + optional Sunday morning 80% holdback
 * - upserts games
 * - deactivates previous lines and inserts one active line per game
 */
export async function syncOddsForActiveWeek() {
  const week = await findActiveWeek();
  if (!week) return { ok: false as const, reason: 'No active week' };

  const games = await fetchNFLSpreadsForWeek({
    id: week.id,
    startTs: week.start_ts,
    endTs: week.end_ts,
    weekNumber: week.week_number
  });

  // Build a single-shot team lookup to avoid per-row queries
  const teamNames = Array.from(new Set(games.flatMap((g) => [g.home_team, g.away_team])));

  // Load all teams once
  const teamsAll = await findTeamsByNames(teamNames);

  const byName = new Map<string, { id: number; name: string }>();
  (teamsAll ?? []).forEach((t) => byName.set(t.name, { id: t.id, name: t.name }));

  let inserted = 0;

  // Supabase JS does not support true SQL transactions, but you can batch operations
  // If you need atomicity, consider using RPC or Postgres functions for the transaction
  for (const g of games) {
    const home = byName.get(g.home_team);
    const away = byName.get(g.away_team);
    if (!home || !away) continue;

    const gameRowId = await upsertGame(g, home, away, week.id); // upsertGame should use supabase service internally
    if (!gameRowId) continue;

    const spread = extractFanduelSpread(g);
    if (!spread) continue;

    const gameId = await upsertGameByExternalId({
      externalGameId: g.id,
      weekId: week.id,
      commenceTime: g.commence_time,
      homeTeamId: home.id,
      awayTeamId: away.id
    });

    const spreadTeamId = spread.spreadTeamName === home.name ? home.id : away.id;

    await setActiveLine({
      gameId,
      spreadTeamId,
      spreadValue: spread.spreadValue,
      source: 'fanduel'
    });

    inserted++;
  }

  return { ok: true as const, count: inserted };
}

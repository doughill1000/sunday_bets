// src/lib/server/oddsSync.ts
import { dbClient } from '$lib/server/db';
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from './odds';
import type { WeekRow, WeekWindow } from '../types/server';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { findTeamsByNames } from './db/queries/findTeamsByNames';
import { upsertGame } from './db/commands/upsert_game';
import { deactivateActiveLines } from './db/commands/deactivate_lines';
import { insertActiveLine } from './db/commands/insert_active_line';

function toWeekWindow(row: WeekRow): WeekWindow {
  return {
    id: row.id,
    startTs: row.startTs,
    endTs: row.endTs,
    weekNumber: row.weekNumber
  };
}

/**
 * Sync fanduel spreads for the active week.
 * - honors monthly cap + optional Sunday morning 80% holdback
 * - upserts games
 * - deactivates previous lines and inserts one active line per game
 */
export async function syncOddsForActiveWeek() {
  const week = await findActiveWeek();
  if (!week) return { ok: false as const, reason: 'No active week' };

  // Fetch odds (Fanduel)
  const weekWindow = toWeekWindow(week);
  const games = await fetchNFLSpreadsForWeek(weekWindow);

  // Build a single-shot team lookup to avoid per-row queries
  const teamNames = Array.from(new Set(games.flatMap((g) => [g.home_team, g.away_team])));

  // Load all teams once
  const teamsAll = await findTeamsByNames(teamNames);

  const byName = new Map<string, { id: number; short_name: string }>();
  (teamsAll ?? []).forEach((t) => byName.set(t.name, { id: t.id, short_name: t.short_name }));

  let inserted = 0;

  await dbClient.transaction(async (tx) => {
    for (const g of games) {
      const home = byName.get(g.home_team);
      const away = byName.get(g.away_team);
      if (!home || !away) continue;

      const gameRow = await upsertGame(tx, g, home, away, week.id);
      if (!gameRow) continue;

      const spread = extractFanduelSpread(g);
      if (!spread) continue;

      const spreadTeamId = spread.spreadTeamName === home.short_name ? home.id : away.id;

      await deactivateActiveLines(tx, gameRow.id);
      await insertActiveLine(tx, gameRow.id, spreadTeamId, spread.spreadValue);

      inserted++;
    }
  });

  return { ok: true as const, count: inserted };
}

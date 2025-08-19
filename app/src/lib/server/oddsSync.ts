// src/lib/server/oddsSync.ts
import { db } from './db';
import { games as gamesTable, gameLines } from '../../db/schema'
import { supabaseService } from './supabase';
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from './odds';
import { and, eq } from 'drizzle-orm';
import type { WeekWindow } from '../types/server';

type WeekRow = {
  id: number;
  start_ts: string;
  end_ts: string;
  is_active: boolean | null;
  week_number: number
};

export async function findActiveWeek(): Promise<WeekRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('*')
    .lte('start_ts', now)
    .gt('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow>();
  if (error) throw error;
  return data ?? null;
}

export async function getSettings() {
  const { data, error } = await supabaseService
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? {};
}

// export async function incrementApiUsage(by = 1) {
//   // Singleton row pattern: update first row
//   const { error } = await supabaseService
//     .from('settings')
//     .update({ odds_api_calls_used_current_month: supabaseService.rpc('inc', { by }) })
//     .neq('odds_api_monthly_cap', null);
//   // If you don't have 'inc' RPC, just read-modify-write in caller
//   return error;
// }

function toWeekWindow(row: WeekRow): WeekWindow {
  return {
    id: row.id,
    start_ts: row.start_ts,
    end_ts: row.end_ts,
    week_number: row.week_number
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

  // // Rate cap guard
  // const st = await getSettings();
  // const cap = st?.odds_api_monthly_cap ?? 1000;
  // const used = st?.odds_api_calls_used_current_month ?? 0;

  // if (used + 1 > cap) {
  //   return { ok: false as const, reason: 'Monthly cap reached', status: 429 };
  // }

  // Optional Sunday morning holdback (>80%)
  // const isSunAM = new Date().getUTCDay() === 0 && new Date().getUTCHours() < 16; // adjust window
  // if (isSunAM && used / cap >= 0.8) return { ok:false as const, reason:'Holdback window', status: 429 };

  // Fetch odds (Fanduel)
  const weekWindow = toWeekWindow(week);
  const games = await fetchNFLSpreadsForWeek(weekWindow);

  // Build a single-shot team lookup to avoid per-row queries
  const teamNames = Array.from(
    new Set(games.flatMap(g => [g.home_team, g.away_team]))
  );

  // Load all teams once
  const { data: teamsAll, error: teamsErr } = await supabaseService
    .from('teams')
    .select('id, name, short_name')
    .in('name', teamNames)

  if (teamsErr) throw teamsErr;

  const byName = new Map<string, { id: number; short_name: string }>();
  (teamsAll ?? []).forEach(t => byName.set(t.name, { id: t.id, short_name: t.short_name }));

  let inserted = 0;

  await db.transaction(async (tx) => {
    for (const g of games) {
      const home = byName.get(g.home_team);
      const away = byName.get(g.away_team);
      if (!home || !away) continue; // or handle mapping


      // Upsert game by external_game_id
      const gameRow = await tx
        .insert(gamesTable)
        // .values({weekId: 1, commenceTime: 'test', homeTeamId: 1, awayTeamId: 2, status:'test', })
        .values({
          weekId: week.id,
          externalGameId: g.id,
          commenceTime: g.commence_time,
          homeTeamId: home.id,
          awayTeamId: away.id,
          status: 'scheduled',
        })
        .returning()
        .then(rows => rows[0]);

      // If no row was inserted (due to conflict), fetch the existing row
      if (!gameRow) {
        gameRow = await tx
          .select()
          .from(gamesTable)
          .where(
            and(
              eq(gamesTable.externalGameId, g.id),
              eq(gamesTable.weekId, week.id)
            )
          )
          .then(rows => rows[0]);
      }
      if (!gameRow) continue;

      // Extract Fanduel line (one authoritative source)
      const spread = extractFanduelSpread(g);
      if (!spread) continue;

      // BUGFIX from your original: compare once vs home; otherwise pick away.
      const spreadTeamId =
        spread.spreadTeamName === home.short_name ? home.id : away.id;

      // Deactivate previous active line (if any)
      await tx
        .update(gameLines)
        .set({ isActiveLine: false })
        .where(and(
          eq(gameLines.gameId, gameRow.id),
          eq(gameLines.isActiveLine, true)
        ));

      // Insert new active line
      await tx.insert(gameLines).values({
        gameId: gameRow.id,
        source: 'fanduel',
        spreadTeamId,
        spreadValue: spread.spreadValue,
        fetchedAt: new Date().toISOString(),
        isActiveLine: true
      });

      inserted++;
    }
  });

  // Log / increment usage (simple read-modify-write)
  // await supabaseService
  //   .from('settings')
  //   .update({ odds_api_calls_used_current_month: used + 1 })
  //   .neq('odds_api_monthly_cap', 0);

  return { ok: true as const, count: inserted };
}

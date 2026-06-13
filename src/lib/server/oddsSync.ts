// src/lib/server/oddsSync.ts
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from './odds';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { findTeamsByNames } from './db/queries/findTeamsByNames';
import { upsertGameByExternalId } from './db/commands/upsertGameByExternalId';
import { setActiveLine } from './db/commands/setActiveLine';
import { supabaseService } from '$lib/supabase/service';
import { canSyncNow } from './settings';
import type { SyncError, SyncStats } from '$lib/types/server/odds';

export async function syncOddsForActiveWeek(source = 'fanduel'): Promise<SyncStats | SyncError> {
  if (!(await canSyncNow())) {
    return { ok: false, reason: 'Odds API monthly call cap reached' };
  }

  const week = await findActiveWeek();
  if (!week) return { ok: false, reason: 'No active week' };

  const games = await fetchNFLSpreadsForWeek({
    id: week.id,
    startTs: week.start_ts,
    endTs: week.end_ts,
    weekNumber: week.week_number
  });

  const teamNames = Array.from(new Set(games.flatMap((g) => [g.home_team, g.away_team])));
  const teamsAll = await findTeamsByNames(teamNames);
  const byName = new Map(teamsAll.map((t) => [t.name, { id: t.id, name: t.name }]));

  let inserted = 0;
  let processed = 0;
  let unchanged = 0;
  let skippedNoTeams = 0;
  let skippedNoSpread = 0;

  // Process sequentially; easy to read and keeps DB load tame.
  for (const g of games) {
    const home = byName.get(g.home_team);
    const away = byName.get(g.away_team);
    if (!home || !away) {
      skippedNoTeams++;
      continue;
    }

    const spread = extractFanduelSpread(g);
    if (!spread) {
      skippedNoSpread++;
      continue;
    }

    const gameId = await upsertGameByExternalId({
      externalGameId: g.id,
      weekId: week.id,
      commenceTime: g.commence_time,
      homeTeamId: home.id,
      awayTeamId: away.id
    });

    const spreadTeamId = spread.spreadTeamName === home.name ? home.id : away.id;

    // Skip no-op writes: if the active line already matches (team+value), do nothing.
    const { data: active, error: activeErr } = await supabaseService
      .from('game_lines')
      .select('id, spread_team_id, spread_value')
      .eq('game_id', gameId)
      .eq('source', source)
      .eq('is_active_line', true)
      .maybeSingle();

    if (activeErr) throw activeErr;

    if (
      active &&
      active.spread_team_id === spreadTeamId &&
      Number(active.spread_value) === Number(spread.spreadValue)
    ) {
      unchanged++;
      processed++;
      continue;
    }

    await setActiveLine({
      gameId,
      spreadTeamId,
      spreadValue: spread.spreadValue,
      source
    });

    inserted++;
    processed++;
  }

  return {
    ok: true,
    count: inserted,
    totalGames: games.length,
    processed,
    unchanged,
    skippedNoTeams,
    skippedNoSpread
  };
}

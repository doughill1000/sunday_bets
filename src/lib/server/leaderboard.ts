import { getSeasonByYear } from './db/queries/getSeasonByYear';
import { getWeeksForSeason } from './db/queries/getWeeksForSeason';
import { getPlayers } from './db/queries/getPlayers';
import { getPicksForWeeks } from './db/queries/getPicksForWeeks';
import { getSettlementsForGames } from './db/queries/getSettlementsForGames';
import { supabaseService } from '$lib/supabase/service';
import type { ShortResult } from '$lib/constants/picks';
import type {
  GameRow,
  PickRow,
  PlayerRow,
  SettlementRow,
  WeekRow,
  WeekTable
} from '$lib/types/server/leaderboard';
import { formatLockedSpread, gameLabel, gameScore, toResult } from '$lib/utils/leaderboard';

export async function getWeeklyTable(seasonYear: number): Promise<{
  seasonYear: number;
  players: PlayerRow[];
  weeks: number[];
  tableByWeek: Record<number, WeekTable>;
  weekTotals: Record<number, Record<string, number>>;
}> {
  const { data: season } = await getSeasonByYear(seasonYear);
  if (!season) throw new Error('Season not found');

  const { data: weekRows = [] } = await getWeeksForSeason(season.id);
  const weekRowsNotNull = weekRows ?? [];
  const weeks: number[] = weekRowsNotNull.map((w: WeekRow) => w.week_number);
  const weekIds: number[] = weekRowsNotNull.map((w: WeekRow) => w.id);
  const weekNoById = new Map<number, number>(
    weekRowsNotNull.map((w: WeekRow) => [w.id, w.week_number])
  );

  const { data: players = [] } = await getPlayers();
  const playersTyped: PlayerRow[] = (players ?? []).filter(
    (p: any): p is PlayerRow => !!p && typeof p.id === 'string'
  );

  // Picks (must include lock fields & picked team id) — ensure your getPicksForWeeks selects them
  const { data: picksRaw = [] } = await getPicksForWeeks(weekIds as number[]);
  const picks: PickRow[] = (picksRaw as PickRow[]).map((r) => ({
    game_id: r.game_id ?? null,
    week_id: r.week_id ?? null,
    user_id: r.user_id ?? null,
    weight: r.weight ?? null,
    picked_team_short: r.picked_team_short ?? null,
    picked_team_id: r.picked_team_id ?? null,
    locked_spread_value: r.locked_spread_value ?? null,
    locked_spread_team_id: r.locked_spread_team_id ?? null
  }));

  // Games + scores (service role; server-only) — FETCH BEFORE USING THEM
  const { data: gamesRaw = [] } = await supabaseService
    .from('games')
    .select(
      `
      id,
      week_id,
      final_scores,
      home:home_team_id(short_name),
      away:away_team_id(short_name)
    `
    )
    .in('week_id', weekIds)
    .order('commence_time', { ascending: true });

  const games: GameRow[] = (gamesRaw as GameRow[]).map((g) => ({
    id: g.id,
    week_id: g.week_id,
    final_scores: g.final_scores ?? null,
    home: g.home ?? null,
    away: g.away ?? null
  }));

  // Settlements (for W/L/P/M)
  const gameIds = Array.from(
    new Set(picks.map((p) => p.game_id).filter((x): x is string => typeof x === 'string'))
  );
  const { data: settlementsRaw = [] } = gameIds.length
    ? await getSettlementsForGames(gameIds)
    : { data: [] as SettlementRow[] };
  const settlements: SettlementRow[] = (settlementsRaw as SettlementRow[]).map((s) => ({
    user_id: s.user_id,
    game_id: s.game_id,
    points_delta: s.points_delta ?? 0,
    outcome: s.outcome ?? null
  }));

  const settleByKey = new Map<string, { result: ShortResult; pts: number }>();
  for (const s of settlements) {
    settleByKey.set(`${s.user_id}|${s.game_id}`, {
      result: toResult(s.outcome),
      pts: s.points_delta ?? 0
    });
  }

  // Build tables
  const tableByWeek: Record<number, WeekTable> = {};
  for (const w of weeks) tableByWeek[w] = { games: [], cells: {} };

  // Add game rows per week
  for (const g of games) {
    const wk = weekNoById.get(g.week_id) ?? null;
    if (wk == null) continue;
    const homeShort = g.home?.short_name ?? null;
    const awayShort = g.away?.short_name ?? null;
    const score = gameScore(g.final_scores);

    tableByWeek[wk].games.push({
      game_id: g.id,
      label: gameLabel(awayShort, homeShort),
      score,
      isFinal: score !== null
    });
  }

  // Initialize empty cells (game x player)
  for (const wk of weeks) {
    const tbl = tableByWeek[wk];
    for (const row of tbl.games) {
      if (!tbl.cells[row.game_id]) tbl.cells[row.game_id] = {};
      for (const p of playersTyped) {
        tbl.cells[row.game_id][p.id] = { weight: null, team: null, result: null, spread: null };
      }
    }
  }

  // Fill cells from picks/settlements
  for (const r of picks) {
    const wk = weekNoById.get(r.week_id ?? 0) ?? null;
    if (wk == null) continue;
    const gid = r.game_id;
    const uid = r.user_id;
    if (!gid || !uid) continue;

    const s = settleByKey.get(`${uid}|${gid}`);
    if (!tableByWeek[wk].cells[gid]) {
      tableByWeek[wk].cells[gid] = {};
    }
    if (!tableByWeek[wk].cells[gid][uid]) {
      tableByWeek[wk].cells[gid][uid] = { weight: null, team: null, result: null, spread: null };
    }

    tableByWeek[wk].cells[gid][uid] = {
      weight: r.weight,
      team: r.picked_team_short,
      result: s?.result ?? null,
      spread: formatLockedSpread(r.locked_spread_value, r.locked_spread_team_id, r.picked_team_id)
    };
  }

  // ---- Week totals (for collapsed header chips) ----
  // Map game -> week_number
  const gameWeekNo = new Map<string, number>();
  for (const g of games) {
    const wk = weekNoById.get(g.week_id);
    if (wk != null) gameWeekNo.set(g.id, wk);
  }

  // Initialize weekTotals[week][user] = 0
  const weekTotals: Record<number, Record<string, number>> = {};
  for (const wk of weeks) {
    weekTotals[wk] = {};
    for (const p of playersTyped) weekTotals[wk][p.id] = 0;
  }

  // Sum points_delta into weekTotals
  for (const s of settlements) {
    const wk = gameWeekNo.get(s.game_id);
    if (wk == null) continue;
    weekTotals[wk][s.user_id] = (weekTotals[wk][s.user_id] ?? 0) + (s.points_delta ?? 0);
  }

  return {
    seasonYear,
    players: playersTyped,
    weeks,
    tableByWeek,
    weekTotals
  };
}

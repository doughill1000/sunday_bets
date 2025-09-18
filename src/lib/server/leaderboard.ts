import { getSeasonByYear } from './db/queries/getSeasonByYear';
import { getWeeksForSeason } from './db/queries/getWeeksForSeason';
import { getPlayers } from './db/queries/getPlayers';
import { getPicksForWeeks } from './db/queries/getPicksForWeeks';
import { getSettlementsForGames } from './db/queries/getSettlementsForGames';
import { supabaseService } from '$lib/supabase/service';
import type { WeightCode } from '../types/domain';
import type { PickOutcome } from '$lib/types/server';

type Result = 'W' | 'L' | 'P' | 'M';

export type PickCell = {
  weight: WeightCode | number | null;
  team: string | null;
  result: Result | null;
  spread: string | null;
};

export type WeekTable = {
  games: Array<{
    game_id: string;
    label: string;        // e.g. "PHI @ DAL"
    score: string | null; // e.g. "24–21" (away–home); null if not final
    isFinal: boolean;
  }>;
  cells: Record<string /* game_id */, Record<string /* user_id */, PickCell>>;
};

const toResult = (o: PickOutcome | null | undefined): Result =>
  o === 'win' ? 'W' : o === 'loss' ? 'L' : o === 'push' ? 'P' : 'M';

function formatLockedSpread(
  lockedSpreadValue: number | null | undefined,
  lockedSpreadTeamId: number | string | null | undefined,
  pickedTeamId: number | string | null | undefined
): string | null {
  if (lockedSpreadValue == null) return null;
  const v = Number(lockedSpreadValue);
  if (!Number.isFinite(v)) return null;
  if (Math.abs(v) < 1e-9) return 'PK';
  const favoritePicked =
    lockedSpreadTeamId != null &&
    pickedTeamId != null &&
    String(lockedSpreadTeamId) === String(pickedTeamId);
  const mag = Math.abs(v);
  return favoritePicked ? `-${mag}` : `+${mag}`;
}

function gameLabel(awayShort?: string | null, homeShort?: string | null) {
  return `${awayShort ?? 'AWY'} @ ${homeShort ?? 'HOME'}`;
}
function gameScore(finalScores: unknown): string | null {
  if (!finalScores || typeof finalScores !== 'object') return null;
  // @ts-expect-error — final_scores is a jsonb; read guardedly
  const a = Number(finalScores?.away);
  // @ts-expect-error
  const h = Number(finalScores?.home);
  if (!Number.isFinite(a) || !Number.isFinite(h)) return null;
  return `${a}–${h}`; // away–home
}

/** Narrowed row shapes so TS stops complaining */
type PlayerRow = { id: string; display_name: string };
type WeekRow = { id: number; week_number: number };
type PickRow = {
  game_id: string | null;
  week_id: number | string | null;
  user_id: string | null;
  weight: WeightCode | number | null;
  picked_team_short: string | null;
  picked_team_id: string | number | null;
  locked_spread_value: number | null;
  locked_spread_team_id: string | number | null;
};
type SettlementRow = {
  user_id: string;
  game_id: string;
  points_delta: number | null;
  outcome: PickOutcome | null;
};
type GameRow = {
  id: string;
  week_id: number | string;
  final_scores: unknown;
  home?: { short_name?: string | null } | null;
  away?: { short_name?: string | null } | null;
};

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
  const weekNoById = new Map<(number | string), number>(
    weekRowsNotNull.map((w: WeekRow) => [w.id, w.week_number])
  );

  const { data: players = [] } = await getPlayers();
  const playersTyped: PlayerRow[] = (players ?? []).filter(
    (p: any): p is PlayerRow => !!p && typeof p.id === 'string'
  );

  // Picks (must include lock fields & picked team id) — ensure your getPicksForWeeks selects them
  const { data: picksRaw = [] } = await getPicksForWeeks(weekIds as number[]);
  const picks: PickRow[] = (picksRaw as any[]).map((r) => ({
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
    .select(`
      id,
      week_id,
      final_scores,
      home:home_team_id(short_name),
      away:away_team_id(short_name)
    `)
    .in('week_id', weekIds)
    .order('commence_time', { ascending: true });

  const games: GameRow[] = (gamesRaw as any[]).map((g) => ({
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
    : { data: [] as any[] };
  const settlements: SettlementRow[] = (settlementsRaw as any[]).map((s) => ({
    user_id: s.user_id,
    game_id: s.game_id,
    points_delta: s.points_delta ?? 0,
    outcome: s.outcome ?? null
  }));

  const settleByKey = new Map<string, { result: Result; pts: number }>();
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
    const wk = weekNoById.get(r.week_id ?? '') ?? null;
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

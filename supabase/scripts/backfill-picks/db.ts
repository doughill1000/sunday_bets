// db.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseISO, isValid as isValidDate } from 'date-fns';

export function makeClient(): SupabaseClient {
  const url = process.env.PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  console.log('Using Supabase URL:', url);
  if (!url || !key) throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  return createClient(url, key);
}

export async function getSeasonWeekMap(supabase: SupabaseClient, year: number) {
  const { data: seasons, error: sErr } = await supabase
    .from('seasons')
    .select('id, year')
    .eq('year', year)
    .limit(1);
  if (sErr || !seasons?.length) throw new Error(`Season ${year} not found`);
  const seasonId = seasons[0].id;

  const { data: weeks, error: wErr } = await supabase
    .from('weeks')
    .select('id, week_number, start_ts, end_ts')
    .eq('season_id', seasonId);
  if (wErr) throw wErr;

  const byNumber = new Map<number, { id: number; start: string; end: string }>();
  weeks!.forEach((w) =>
    byNumber.set(w.week_number, { id: w.id, start: w.start_ts, end: w.end_ts })
  );
  return { seasonId, weekByNumber: byNumber };
}

export async function getTeamsMap(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('teams').select('id, short_name, external_key');
  if (error) throw error;
  const byCode = new Map<string, number>();
  for (const t of data!) {
    if (t.short_name) byCode.set(t.short_name.toUpperCase(), t.id);
    if (t.external_key) byCode.set(t.external_key.toUpperCase(), t.id);
  }
  return byCode;
}

export async function findOrCreateGame(opts: {
  supabase: SupabaseClient;
  weekId: number;
  homeTeamId: number;
  awayTeamId: number;
  rawKickoff?: string | Date;
  fallbackKickoff?: string;
  dryRun?: boolean;
}) {
  const { supabase, weekId, homeTeamId, awayTeamId, rawKickoff, fallbackKickoff, dryRun } = opts;

  // Find existing
  {
    const { data, error } = await supabase
      .from('games')
      .select('id')
      .eq('week_id', weekId)
      .eq('home_team_id', homeTeamId)
      .eq('away_team_id', awayTeamId)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0].id as string;
  }

  // Need to create
  let commence_time: string | null = null;
  if (rawKickoff) {
    const d = typeof rawKickoff === 'string' ? parseISO(rawKickoff) : new Date(rawKickoff);
    if (isValidDate(d)) commence_time = d.toISOString();
  }
  if (!commence_time && fallbackKickoff) {
    const d = parseISO(fallbackKickoff);
    if (isValidDate(d)) commence_time = d.toISOString();
  }
  if (!commence_time) throw new Error('No kickoff time available; pass --fallback-kickoff');

  if (dryRun) {
    console.log(
      `[dry] create game week=${weekId} home=${homeTeamId} away=${awayTeamId} kickoff=${commence_time}`
    );
    return `00000000-0000-0000-0000-${String(homeTeamId).padStart(12, '0')}`;
  }

  const { data: ins, error: iErr } = await supabase
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      commence_time,
      status: 'scheduled'
    })
    .select('id')
    .limit(1);
  if (iErr) throw iErr;
  return ins![0].id as string;
}

/**
 * Insert a new immutable game_lines row, deactivate previous active lines for the same game,
 * and return the new line id. This is INSERT-only (no upserts).
 */
export async function insertGameLineAndDeactivate(opts: {
  supabase: SupabaseClient;
  gameId: string;
  spreadTeamId: number; // favorite team id (or team the spread applies to)
  spreadValue: number; // negative for favorite, positive for dog, 0 for PK
  fetchedAt?: string; // ISO timestamp; defaults to now()
  dryRun?: boolean;
}) {
  const { supabase, gameId, spreadTeamId, spreadValue, fetchedAt, dryRun } = opts;
  const source = 'fanduel';
  const ts = fetchedAt ?? new Date().toISOString();

  if (dryRun) {
    console.log('[dry] insert game_line', {
      gameId,
      spreadTeamId,
      spreadValue,
      source,
      fetched_at: ts
    });
    console.log('[dry] deactivate prior active lines for game', gameId);
    return '00000000-0000-0000-0000-000000000000';
  }

  await supabase
  .from('game_lines')
  .update({ is_active_line: false })
  .eq('game_id', gameId)
  .eq('is_active_line', true);


// 2) Insert new active
const { data: ins, error: insErr } = await supabase
  .from('game_lines')
  .insert({ game_id: gameId, spread_team_id: spreadTeamId, spread_value: spreadValue, source, fetched_at: ts, is_active_line: true })
  .select('id')
  .limit(1);

  console.log('Inserted new game_line', ins?.[0]?.id, `(${spreadTeamId}, ${spreadValue}) for game ${gameId}`);

  if (insErr) throw insErr;
  const lineId = ins![0].id as string;

  return lineId;
}

/**
 * Upsert a pick and attach the line snapshot + locked_line_id.
 * NOTE: we keep upsert here ONLY for (user_id, game_id) to avoid dup picks; lines are INSERT-only.
 */
export async function upsertPick(opts: {
  supabase: SupabaseClient;
  userId: string;
  gameId: string;
  pickedTeamId: number;
  weight: 'L' | 'M' | 'H' | 'A';
  lockAtKickoff: boolean;
  lineTeamId: number;
  lineValue: number;
  lockedLineId?: string | null;
  dryRun?: boolean;
  locked_by: string;
}) {
  const {
    supabase,
    userId,
    gameId,
    pickedTeamId,
    weight,
    lockAtKickoff,
    lineTeamId,
    lineValue,
    lockedLineId,
    dryRun,
    locked_by
  } = opts;

  let locked_at: string | null = null;
  if (lockAtKickoff) {
    const { data } = await supabase.from('games').select('commence_time').eq('id', gameId).limit(1);
    locked_at = data?.[0]?.commence_time ?? null;
  }

  const payload: any = {
    user_id: userId,
    game_id: gameId,
    picked_team_id: pickedTeamId,
    weight,
    locked_at,
    locked_spread_team_id: lineTeamId ?? null,
    locked_spread_value: lineValue != null ? Math.abs(lineValue) : null,
    locked_line_id: lockedLineId ?? null,
    locked_by
  };

  if (dryRun) {
    console.log('[dry] upsert pick', payload);
    return;
  }

  const { error } = await supabase.from('picks').upsert(payload, { onConflict: 'user_id,game_id' });
  if (error) throw error;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseISO, isValid as isValidDate } from 'date-fns';

export function makeClient(): SupabaseClient {
  // allow either var name; prefer *_KEY
  const url = process.env.PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  console.log('Using Supabase URL:', url);
  if (!url || !key) throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  return createClient(url, key);
}

export async function getSeasonWeekMap(supabase: SupabaseClient, year: number) {
  const { data: seasons, error: sErr } = await supabase
    .from('seasons').select('id, year').eq('year', year).limit(1);
  if (sErr || !seasons?.length) throw new Error(`Season ${year} not found`);
  const seasonId = seasons[0].id;

  const { data: weeks, error: wErr } = await supabase
    .from('weeks').select('id, week_number, start_ts, end_ts').eq('season_id', seasonId);
  if (wErr) throw wErr;

  const byNumber = new Map<number, { id: number; start: string; end: string }>();
  weeks!.forEach((w) => byNumber.set(w.week_number, { id: w.id, start: w.start_ts, end: w.end_ts }));
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
    console.log(`[dry] create game week=${weekId} home=${homeTeamId} away=${awayTeamId} kickoff=${commence_time}`);
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

export async function upsertPick(opts: {
  supabase: SupabaseClient;
  userId: string;
  gameId: string;
  pickedTeamId: number;
  weight: 'L' | 'M' | 'H' | 'A';
  lockAtKickoff: boolean;
  lineTeamId?: number;
  lineValue?: number;
  dryRun?: boolean;
  locked_by: string;
}) {
  const { supabase, userId, gameId, pickedTeamId, weight, lockAtKickoff, lineTeamId, lineValue, dryRun, locked_by } = opts;

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
    locked_spread_value: lineValue ?? null,
    locked_by
  };

  if (dryRun) {
    console.log('[dry] upsert pick', payload);
    return;
  }

  const { error } = await supabase
    .from('picks')
    .upsert(payload, { onConflict: 'user_id,game_id' });
  if (error) throw error;
}

// src/lib/server/admin.ts
import { supabaseService } from '$lib/supabase/service';

export type SettingsSummary = {
  cap: number;
  used: number;
  remaining: number;
  usagePct: number; // 0..1
};

export type ActiveWeek = {
  id: number;
  week_number: number;
  start_ts: string;
  end_ts: string;
} | null;

export type GameplaySettings = {
  finalWeekUnlimitedAllin: boolean;
};

/** A week the admin can pick to grade, labelled for humans (no raw ids in the UI). */
export type GradableWeek = {
  id: number;
  week_number: number;
  start_ts: string;
  end_ts: string;
  season_year: number;
  game_count: number;
};

export type SeasonOption = { id: number; year: number };

type SettingsRow = {
  odds_api_monthly_cap: number | null;
  odds_api_calls_used_current_month: number | null;
  final_week_unlimited_allin: boolean | null;
  admin_flags?: Record<string, unknown> | null;
};

// Keep this single-responsibility & easy to unit-test.
export async function getSettingsSummary(): Promise<SettingsSummary> {
  const { data: st, error } = await supabaseService
    .from('settings')
    .select('odds_api_monthly_cap,odds_api_calls_used_current_month')
    .limit(1)
    .maybeSingle<SettingsRow>();

  if (error) {
    // Sensible defaults if the row is missing or RLS blocks it
    const cap = 1000,
      used = 0;
    return { cap, used, remaining: cap - used, usagePct: used / cap };
  }

  const cap = st?.odds_api_monthly_cap ?? 1000;
  const used = st?.odds_api_calls_used_current_month ?? 0;
  const remaining = Math.max(cap - used, 0);
  const usagePct = cap > 0 ? Math.min(used / cap, 1) : 1;

  return { cap, used, remaining, usagePct };
}

export async function getGameplaySettings(): Promise<GameplaySettings> {
  const { data: st } = await supabaseService
    .from('settings')
    .select('final_week_unlimited_allin')
    .limit(1)
    .maybeSingle<SettingsRow>();

  return {
    finalWeekUnlimitedAllin: st?.final_week_unlimited_allin ?? true
  };
}

/**
 * Every week the admin can grade, newest first, with a human label's worth of
 * context: the season year and how many games the week holds. Powers the week
 * dropdowns in the Grading card so an admin never has to look up a raw week id.
 */
export async function getGradableWeeks(): Promise<GradableWeek[]> {
  const { data, error } = await supabaseService
    .from('weeks')
    .select('id,week_number,start_ts,end_ts,seasons(year),games(count)')
    .order('start_ts', { ascending: false })
    .limit(300);

  if (error || !data) return [];

  // Embedded `seasons` is to-one (weeks.season_id → seasons); `games(count)`
  // returns a one-row aggregate. Cast to the shape PostgREST actually returns.
  const rows = data as unknown as Array<{
    id: number;
    week_number: number;
    start_ts: string;
    end_ts: string;
    seasons: { year: number } | null;
    games: { count: number }[];
  }>;

  return rows.map((w) => ({
    id: w.id,
    week_number: w.week_number,
    start_ts: w.start_ts,
    end_ts: w.end_ts,
    season_year: w.seasons?.year ?? 0,
    game_count: w.games?.[0]?.count ?? 0
  }));
}

/** Seasons for the (advanced) whole-season grade picker, newest first. */
export async function getSeasons(): Promise<SeasonOption[]> {
  const { data, error } = await supabaseService
    .from('seasons')
    .select('id,year')
    .order('year', { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getActiveWeek(nowIso: string): Promise<ActiveWeek> {
  const { data: week, error } = await supabaseService
    .from('weeks')
    .select('id,week_number,start_ts,end_ts')
    // want start_ts <= now <= end_ts
    .lte('start_ts', nowIso)
    .gte('end_ts', nowIso)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return week ?? null;
}

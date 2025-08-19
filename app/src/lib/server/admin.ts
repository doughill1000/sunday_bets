// src/lib/server/admin.ts
import { supabaseService } from './supabase';

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
  is_active: boolean | null;
} | null;

type SettingsRow = {
  odds_api_monthly_cap: number | null;
  odds_api_calls_used_current_month: number | null;
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
    const cap = 1000, used = 0;
    return { cap, used, remaining: cap - used, usagePct: used / cap };
  }

  const cap = st?.odds_api_monthly_cap ?? 1000;
  const used = st?.odds_api_calls_used_current_month ?? 0;
  const remaining = Math.max(cap - used, 0);
  const usagePct = cap > 0 ? Math.min(used / cap, 1) : 1;

  return { cap, used, remaining, usagePct };
}

export async function getActiveWeek(nowIso: string): Promise<ActiveWeek> {
  const { data: week, error } = await supabaseService
    .from('weeks')
    .select('id,week_number,start_ts,end_ts,is_active')
    .lte('start_ts', nowIso)
    .gt('end_ts', nowIso)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return week ?? null;
}

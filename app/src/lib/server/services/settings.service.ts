// src/lib/server/settings.ts
import { supabaseService } from './supabase.service';

export async function getSettings() {
  const { data, error } = await supabaseService.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function canSyncNow() {
  const st = await getSettings();
  if (!st) return false;
  const { odds_api_monthly_cap: cap, odds_api_calls_used_current_month: used } = st;
  return used < cap && used / cap < 0.8; // example guard
}

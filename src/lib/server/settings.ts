// src/lib/server/settings.ts
import { supabaseService } from '$lib/supabase/service';

export async function getSettings() {
  const { data, error } = await supabaseService.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function canSyncNow() {
  const st = await getSettings();
  if (!st) return false;
  const { odds_api_monthly_cap: cap, odds_api_calls_used_current_month: used } = st;
  return used < cap;
}

// The Odds API reports the credit cost of each request in the
// x-requests-last response header; accumulate it against the monthly cap.
export async function recordOddsApiUsage(cost: number) {
  const st = await getSettings();
  if (!st) return;
  const used = (st.odds_api_calls_used_current_month ?? 0) + cost;
  const { error } = await supabaseService
    .from('settings')
    .update({ odds_api_calls_used_current_month: used })
    .eq('id', st.id);
  if (error) throw error;
}

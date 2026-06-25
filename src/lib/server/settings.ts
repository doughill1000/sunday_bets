// src/lib/server/settings.ts
import { supabaseService } from '$lib/supabase/service';

export async function getSettings() {
  const { data, error } = await supabaseService.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export type GroupCreationMode = 'gated' | 'open';

// The global create-group gate (ADR-0006, decision 3). Defaults to 'gated' when
// the settings row or column is absent, so creation is never accidentally open.
export async function getGroupCreationMode(): Promise<GroupCreationMode> {
  const st = await getSettings();
  return st?.group_creation_mode === 'open' ? 'open' : 'gated';
}

// Whether a user may create a group right now: in 'open' mode anyone can, in
// 'gated' mode only users with the can_create_group capability.
export async function canCreateGroup(userId: string): Promise<boolean> {
  if ((await getGroupCreationMode()) === 'open') return true;
  const { data, error } = await supabaseService
    .from('users')
    .select('can_create_group')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.can_create_group ?? false;
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

export async function resetOddsApiUsage() {
  const st = await getSettings();
  if (!st) return;
  const { error } = await supabaseService
    .from('settings')
    .update({
      odds_api_calls_used_current_month: 0,
      reset_on: new Date().toISOString().split('T')[0]
    })
    .eq('id', st.id);
  if (error) throw error;
}

/**
 * Config resolution path
 * ─────────────────────
 * Gameplay config  → group_config / group_week_overrides, keyed by group_id.
 *   Read here for: scoring rules, line source, special-week overrides.
 *   Written by: service_role only (no direct client writes; commissioner UI is v2.0-16).
 *
 * Operational config → global settings table (single-row, no group_id).
 *   Read from: src/lib/server/settings.ts
 *   Contains: odds-quota caps, API call counter, reset date.
 *
 * Callers that need both stores (e.g. grading) import from each module separately.
 */
import { supabaseService } from '$lib/supabase/service';

export async function getGroupConfig(groupId: string) {
  const { data, error } = await supabaseService
    .from('group_config')
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getGroupWeekOverrides(groupId: string, weekId: number) {
  const { data, error } = await supabaseService
    .from('group_week_overrides')
    .select('*')
    .eq('group_id', groupId)
    .eq('week_id', weekId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

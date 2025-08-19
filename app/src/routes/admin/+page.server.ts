// src/routes/admin/+page.server.ts
import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';

type SettingsRow = {
  odds_api_monthly_cap: number | null;
  odds_api_calls_used_current_month: number | null;
  admin_flags?: Record<string, unknown> | null;
};

export const load: PageServerLoad = async () => {
  // Settings
  const { data: st } = await supabaseService
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle<SettingsRow>();

  const cap = st?.odds_api_monthly_cap ?? 1000;
  const used = st?.odds_api_calls_used_current_month ?? 0;
  const remaining = Math.max(cap - used, 0);
  const usagePct = cap > 0 ? Math.min(used / cap, 1) : 1;

  // Active week (UI message)
  const nowIso = new Date().toISOString();
  const { data: week } = await supabaseService
    .from('weeks')
    .select('id, week_number, start_ts, end_ts, is_active')
    .lte('start_ts', nowIso)
    .gt('end_ts', nowIso)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    settings: { cap, used, remaining, usagePct },
    activeWeek: week ?? null,
  };
};

// src/lib/server/oddsSync.ts
import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function findActiveWeek() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .lte('start_ts', now)
    .gte('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data ?? null;
}

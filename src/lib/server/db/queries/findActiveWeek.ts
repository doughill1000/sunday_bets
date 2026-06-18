import { supabaseService } from '$lib/supabase/service';

export async function findActiveWeek() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseService
    .from('weeks')
    .select('*')
    .lte('start_ts', now)
    .gte('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

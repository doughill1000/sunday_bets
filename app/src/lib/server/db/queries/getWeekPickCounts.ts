import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function getWeekPickCounts(weekId: number) {
  const { data, error } = await supabase.rpc('get_week_pick_counts', { week_id: weekId }); // If you have a view or RPC for this

  if (error) throw error;
  return data ?? [];
}

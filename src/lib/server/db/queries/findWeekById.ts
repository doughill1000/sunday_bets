import { supabaseService } from '$lib/supabase/service';

export async function findWeekById(weekId: number) {
  const { data, error } = await supabaseService.from('weeks').select('*').eq('id', weekId).single();

  if (error) throw error;
  return data ?? null;
}

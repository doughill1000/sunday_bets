import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function findWeekById(weekId: string | number) {
  const { data, error } = await supabase.from('weeks').select('*').eq('id', weekId).single();

  if (error) throw error;
  return data ?? null;
}

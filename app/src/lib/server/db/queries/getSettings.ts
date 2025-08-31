import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).single();

  if (error) throw error;
  return data ?? {};
}

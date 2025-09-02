import { supabaseService } from '$lib/supabase/service';

export async function getSettings() {
  const { data, error } = await supabaseService.from('settings').select('*').limit(1).single();

  if (error) throw error;
  return data ?? {};
}

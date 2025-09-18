import { supabaseService } from '$lib/supabase/service';

export async function getSeasonByYear(year: number) {
  return supabaseService.from('seasons').select('id, year').eq('year', year).single();
}

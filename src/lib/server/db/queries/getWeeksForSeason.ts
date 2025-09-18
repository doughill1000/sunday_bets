
import { supabaseService } from '$lib/supabase/service';

export async function getWeeksForSeason(seasonId: number) {
  return supabaseService.from('weeks').select('id, week_number').eq('season_id', seasonId).order('week_number', { ascending: true });
}

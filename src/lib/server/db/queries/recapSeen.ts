import { supabaseService } from '$lib/supabase/service';

export async function hasSeenRecap(
  userId: string,
  groupId: string,
  seasonYear: number,
  weekNumber: number
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('recap_seen')
    .select('user_id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

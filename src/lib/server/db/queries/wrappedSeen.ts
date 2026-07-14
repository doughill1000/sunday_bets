import { supabaseService } from '$lib/supabase/service';

export async function hasSeenWrapped(
  userId: string,
  groupId: string,
  seasonYear: number
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('wrapped_seen')
    .select('user_id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

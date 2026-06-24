import { supabaseService } from '$lib/supabase/service';

export async function findTeamsByExternalKeys() {
  const { data, error } = await supabaseService
    .from('teams')
    .select('id, external_key')
    .eq('league', 'NFL')
    .not('external_key', 'is', null);

  if (error) throw error;
  return (data ?? []) as { id: number; external_key: string }[];
}

import { supabaseService } from '$lib/supabase/service';

export async function findTeamsByNames(names: string[]) {
  const { data, error } = await supabaseService
    .from('teams')
    .select('id, name, short_name')
    .in('name', names);

  if (error) throw error;
  return data ?? [];
}

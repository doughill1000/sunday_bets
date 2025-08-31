import { createSupabaseService } from '$lib/supabase/service';

const supabase = createSupabaseService();

export async function findTeamsByNames(names: string[]) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .in('name', names);

  if (error) throw error;
  return data ?? [];
}

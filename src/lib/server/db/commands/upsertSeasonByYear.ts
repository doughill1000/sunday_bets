import { supabaseService } from '$lib/supabase/service';

export async function upsertSeasonByYear(year: number): Promise<number> {
  const { data, error } = await supabaseService
    .from('seasons')
    .upsert({ league: 'NFL', year }, { onConflict: 'league,year' })
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error(`upsertSeasonByYear: no id returned for year ${year}`);
  return data.id;
}

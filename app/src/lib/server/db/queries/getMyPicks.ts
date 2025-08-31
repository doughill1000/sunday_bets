import { createSSRClient } from '$lib/supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export async function getMyPicks(event: RequestEvent, weekId: string) {
  const supabase = createSSRClient(event);
  const { data, error } = await supabase
    .from('picks_view')
    .select('*')
    .eq('week_id', weekId);

  if (error) throw error;
  return data ?? [];
}
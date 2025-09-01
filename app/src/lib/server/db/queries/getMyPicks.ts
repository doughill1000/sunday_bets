import type { RequestEvent } from '@sveltejs/kit';

export async function getMyPicks(event: RequestEvent, weekId: number) {
  const supabase = event.locals.supabase;
  const { data, error } = await supabase.from('picks_status_view').select('*').eq('week_id', weekId);

  if (error) throw error;
  return data ?? [];
}

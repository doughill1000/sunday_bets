import type { RequestEvent } from '@sveltejs/kit';

export async function getMyPicks(event: RequestEvent, weekId: number) {
  const supabase = event.locals.supabase; // request-scoped client (RLS)
  const { data, error } = await supabase
    .from('picks_status_view_user') // <-- use user-scoped view
    .select('*')
    .eq('week_id', weekId);

  if (error) throw error;
  return data ?? [];
}

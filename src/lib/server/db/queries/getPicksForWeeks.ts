import { supabaseService } from '$lib/supabase/service';

export function getPicksForWeeks(weekIds: number[], groupId: string) {
  return supabaseService
    .from('picks_status_view_admin')
    .select(
      `
    game_id,
    week_id,
    user_id,
    weight,
    picked_team_short,
    picked_team_id,
    locked_spread_value,
    locked_spread_team_id
    `
    )
    .in('week_id', weekIds)
    .eq('group_id', groupId);
}

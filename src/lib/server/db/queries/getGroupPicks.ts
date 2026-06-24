import type { RequestEvent } from '@sveltejs/kit';
import type { GroupPickEntry } from '$lib/types/picks';

export async function getGroupPicks(
  event: RequestEvent,
  weekId: number,
  groupId: string
): Promise<GroupPickEntry[]> {
  const { data, error } = await event.locals.supabase
    .from('picks_group_view')
    .select('user_id, display_name, game_id, picked_side, weight, picked_team_short')
    .eq('week_id', weekId)
    .eq('group_id', groupId);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    displayName: r.display_name as string | null,
    gameId: r.game_id as string,
    pickedSide: r.picked_side as GroupPickEntry['pickedSide'],
    weight: r.weight as GroupPickEntry['weight'],
    pickedTeamShort: r.picked_team_short as string | null
  }));
}

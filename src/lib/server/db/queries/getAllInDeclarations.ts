import type { RequestEvent } from '@sveltejs/kit';
import type { GroupPickEntry } from '$lib/types/picks';

// ADR-0023: reads locked All-In (weight='A') declarations for a group + week via
// the security-definer public.all_in_declarations RPC. The RPC's internal
// is_member() check is the trust boundary — it reveals co-members' All-Ins
// pre-kickoff (game + side/team + weight), while base-table picks RLS keeps every
// other weight (L/M/H) sealed until kickoff. Rows reuse the GroupPickEntry shape.
export async function getAllInDeclarations(
  event: RequestEvent,
  weekId: number,
  groupId: string
): Promise<GroupPickEntry[]> {
  const { data, error } = await event.locals.supabase.rpc('all_in_declarations', {
    p_group_id: groupId,
    p_week_id: weekId
  });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    displayName: r.display_name as string | null,
    avatarKey: r.avatar_key as string | null,
    gameId: r.game_id as string,
    pickedSide: r.picked_side as GroupPickEntry['pickedSide'],
    weight: r.weight as GroupPickEntry['weight'],
    pickedTeamShort: r.picked_team_short as string | null
  }));
}

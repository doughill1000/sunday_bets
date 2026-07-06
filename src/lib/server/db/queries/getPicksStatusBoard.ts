import type { RequestEvent } from '@sveltejs/kit';
import type { PickStatusBoardEntry } from '$lib/types/picks';

// ADR-0019 counts-only status carve-out: reads the group-visible "who's picked"
// status board for a group + week via the security-definer public.picks_status_board
// RPC. The RPC's internal is_member() check is the trust boundary — it exposes each
// active member's picks-made-vs-games-available COUNT pre-kickoff (e.g. 9/13), while
// base-table picks RLS keeps every pick's content (side/team/weight/game) sealed until
// kickoff. Non-members receive zero rows.
export async function getPicksStatusBoard(
  event: RequestEvent,
  weekId: number,
  groupId: string
): Promise<PickStatusBoardEntry[]> {
  const { data, error } = await event.locals.supabase.rpc('picks_status_board', {
    p_group_id: groupId,
    p_week_id: weekId
  });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    displayName: r.display_name as string | null,
    avatarKey: r.avatar_key as string | null,
    picksMade: r.picks_made as number,
    gamesAvailable: r.games_available as number,
    isComplete: r.is_complete as boolean
  }));
}

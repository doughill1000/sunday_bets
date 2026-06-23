import { supabaseService } from '$lib/supabase/service';
import type { LeaderboardPlayer } from '$lib/types/leaderboard';

export async function getPlayers(groupId: string): Promise<LeaderboardPlayer[]> {
  const { data, error } = await supabaseService
    .from('group_memberships')
    .select('users!inner(id, display_name, avatar_key)')
    .eq('group_id', groupId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.users.id,
    display_name: row.users.display_name ?? '',
    avatar_key: row.users.avatar_key
  }));
}

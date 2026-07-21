import { supabaseService } from '$lib/supabase/service';
import type { LeaderboardPlayer } from '$lib/types/leaderboard';
import { participationStartMs } from '$lib/domain/participation';

/**
 * The group's roster: every ACTIVE member, carrying their ADR-0037 participation boundary.
 *
 * `status = 'active'` matches the population grading scores (ADR-0024) — a 'pending' invite
 * has not joined yet and must not appear on a roster that is then paired with games (#724).
 *
 * `participation_start` is resolved here (the greatest of the league's `competition_starts_at`
 * and this member's `joined_at`) so callers that enumerate membership × games themselves — the
 * Weekly pick grid — can drop games that predate a member's participation instead of showing
 * them as missed. Surfaces that read `pick_settlement` inherit that correctness from the
 * grading choke point and can ignore the field.
 */
export async function getPlayers(groupId: string): Promise<LeaderboardPlayer[]> {
  const { data, error } = await supabaseService
    .from('group_memberships')
    .select(
      'joined_at, groups!inner(competition_starts_at), users!inner(id, display_name, avatar_key)'
    )
    .eq('group_id', groupId)
    .eq('status', 'active');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.users.id,
    display_name: row.users.display_name ?? '',
    avatar_key: row.users.avatar_key,
    participation_start: participationStartMs(row.groups?.competition_starts_at, row.joined_at)
  }));
}

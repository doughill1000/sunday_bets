import { supabaseService } from '$lib/supabase/service';
import { clampLimit, decodeCursor, encodeCursor } from '$lib/server/pagination';

export type GroupMemberRole = 'commissioner' | 'member';

export type GroupMember = {
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
  displayName: string;
  avatarKey: string | null;
};

/** Opaque keyset cursor for the members list: the last row's ordering tuple. */
type GroupMembersCursor = { r: GroupMemberRole; j: string; u: string };

export type GroupMembersPage = {
  members: GroupMember[];
  /** Pass back as `cursor` to fetch the next page; `null` when no more rows. */
  nextCursor: string | null;
};

/**
 * One bounded, keyset-paginated page of a group's members (issue #152). Backed by the
 * group_members_page RPC; ordered role -> joined_at -> user_id, stable under inserts,
 * one index range scan regardless of group size. For real groups (~6 members) the
 * first page contains everyone, so existing output is unchanged.
 */
export async function getGroupMembersPage(
  groupId: string,
  opts: { limit?: number; cursor?: string | null } = {}
): Promise<GroupMembersPage> {
  const limit = clampLimit(opts.limit);
  const after = decodeCursor<GroupMembersCursor>(opts.cursor);

  // Fetch one extra row to detect a next page without a second round-trip.
  const { data, error } = await supabaseService.rpc('group_members_page', {
    p_group_id: groupId,
    p_limit: limit + 1,
    p_after_role: after?.r,
    p_after_joined_at: after?.j,
    p_after_user_id: after?.u
  });
  if (error) throw error;

  const rows = (data ?? []) as {
    user_id: string;
    role: GroupMemberRole;
    joined_at: string;
    display_name: string | null;
    avatar_key: string | null;
  }[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const members: GroupMember[] = page.map((m) => ({
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    displayName: m.display_name ?? '',
    avatarKey: m.avatar_key ?? null
  }));
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ r: last.role, j: last.joined_at, u: last.user_id }) : null;

  return { members, nextCursor };
}

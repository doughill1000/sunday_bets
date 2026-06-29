// Client-safe group DTOs (shared by server queries and the cached read screens).
//
// Lives under `$lib/types` — not the server-only `$lib/server` — so universal `+page.ts`
// loads and page components can type the cached Group payload without importing server
// code (ADR-0017). Mirrors how stats / leaderboard / honors types already live here.

export type GroupMemberRole = 'commissioner' | 'member';

export type GroupMember = {
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
  displayName: string;
  avatarKey: string | null;
};

export type GroupMembersPage = {
  members: GroupMember[];
  /** Pass back as `cursor` to fetch the next page; `null` when no more rows. */
  nextCursor: string | null;
};

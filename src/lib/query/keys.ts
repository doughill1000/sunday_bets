// Query-key factories for the client-side TanStack Query cache (ADR-0017).
//
// Keys are per `(groupId, season)` so switching groups stays correct and instant: a
// previously-visited group renders from its own cache entry. The cache is a latency
// optimization, never the security boundary — every read is still membership-validated
// server-side and `group_id`-filtered.

/** Read screens whose query data is shareable and therefore allowed to be persisted to
 * IndexedDB. Commissioner/invite data is never keyed under these roots, so it is
 * structurally excluded from persistence (ADR-0017 boundary 3). */
export const SHAREABLE_QUERY_ROOTS = ['stats', 'group', 'leaderboard'] as const;

export const queryKeys = {
  stats: (groupId: string, seasonYear: number) => ['stats', groupId, seasonYear] as const,
  group: (groupId: string, seasonYear: number) => ['group', groupId, seasonYear] as const,
  leaderboard: (
    groupId: string,
    seasonYear: number,
    view: string,
    week: number | null,
    cursor: string | null
  ) => ['leaderboard', groupId, seasonYear, view, week, cursor] as const
};

/** Prefix keys for targeted post-mutation invalidation. `invalidateQueries` matches any
 * query whose key starts with the given prefix, so these invalidate every season/view. */
export const invalidationKeys = {
  stats: (groupId: string) => ['stats', groupId] as const,
  group: (groupId: string) => ['group', groupId] as const,
  leaderboard: (groupId: string) => ['leaderboard', groupId] as const
};

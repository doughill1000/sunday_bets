// Query-key factories for the client-side TanStack Query cache (ADR-0017).
//
// Keys are per `(groupId, season)` so switching groups stays correct and instant: a
// previously-visited group renders from its own cache entry. The cache is a latency
// optimization, never the security boundary — every read is still membership-validated
// server-side and `group_id`-filtered.

/** Read screens whose query data is shareable and therefore allowed to be persisted to
 * IndexedDB. Commissioner/invite data is never keyed under these roots, so it is
 * structurally excluded from persistence (ADR-0017 boundary 3). */
export const SHAREABLE_QUERY_ROOTS = ['stats', 'group', 'leaderboard', 'league'] as const;

export const queryKeys = {
  stats: (groupId: string, seasonYear: number) => ['stats', groupId, seasonYear] as const,
  group: (groupId: string, seasonYear: number) => ['group', groupId, seasonYear] as const,
  leaderboard: (
    groupId: string,
    seasonYear: number,
    view: string,
    week: number | null,
    cursor: string | null
  ) => ['leaderboard', groupId, seasonYear, view, week, cursor] as const,
  // League ATS is group-independent, so it is keyed by season alone (issue #406).
  league: (seasonYear: number) => ['league', seasonYear] as const,
  // The forward-looking slate (issue #429) is week- and line-sensitive, so it is a distinct
  // root — deliberately NOT in SHAREABLE_QUERY_ROOTS, so a cold PWA relaunch refetches the
  // current line instead of serving a superseded one from IndexedDB (ADR-0017).
  leagueSlate: (seasonYear: number) => ['league-slate', seasonYear] as const,
  // Per-team drill-down game log, lazily fetched when a team expands (issue #428). Under the
  // 'league' root so it shares the shareable/persistable class (public, group-independent).
  leagueTeam: (teamId: number, seasonYear: number) =>
    ['league', 'team', teamId, seasonYear] as const,
  // Pooled "Last N seasons" market-cut trends (epic #424). Season-independent — it spans the
  // recent seasons — so it takes no season arg. Under the 'league' root (public, shareable).
  leagueTrends: () => ['league', 'trends'] as const
};

/** Prefix keys for targeted post-mutation invalidation. `invalidateQueries` matches any
 * query whose key starts with the given prefix, so these invalidate every season/view. */
export const invalidationKeys = {
  stats: (groupId: string) => ['stats', groupId] as const,
  group: (groupId: string) => ['group', groupId] as const,
  leaderboard: (groupId: string) => ['leaderboard', groupId] as const
};

// Client-safe payload types for the cached read queries (ADR-0017).
//
// These describe the JSON shapes returned by the `/api/{stats,group,leaderboard}` read
// routes so universal `+page.ts` loads and page components can stay typed without
// importing the server-only composers in `$lib/server/**`. The underlying entry types
// live under `$lib/types/**` (not the server-only `$lib/server` dir), so importing them
// here is client-safe — only types cross the boundary, and they are erased at build.
import type { SeasonStats, AllTimeTotalsEntry } from '$lib/types/server/stats';
import type { SeasonLeaderboardEntry } from '$lib/types/leaderboard';
import type { GroupMember } from '$lib/types/group';
import type { LeagueHonors, BadgeAward } from '$lib/types/honors';

/** Eager, season-scoped Stats payload cached under `['stats', groupId, season]`. */
export type StatsCachePayload = SeasonStats & {
  seasonYear: number;
  totals: SeasonLeaderboardEntry[];
  allTimeTotals: AllTimeTotalsEntry[];
  /** Group-level: drop-worst-week is enabled with a committed start year (ADR-0018).
   *  Drives the Career "Standings points" caption, which spans every season rather than
   *  the one in view, so it is not season-scoped like the Leaderboard's flag. */
  dropActive: boolean;
};

/**
 * Shareable Group payload cached under `['group', groupId, season]`. Contains only
 * non-sensitive data that every member may see (ADR-0017 boundary 3). Commissioner-only
 * fields — `isCommissioner`, `invites`, `gradingPreset`, `dropWorstWeek`, `presetLocked` —
 * are deliberately absent: they stay on the server `load` and are never cached/persisted.
 */
export type GroupCachePayload = {
  group: { id: string; name: string };
  members: GroupMember[];
  /** Keyset cursor for the next members page; `null` when the first page holds everyone. */
  membersCursor: string | null;
  honors: LeagueHonors;
  badges: BadgeAward[];
};

/**
 * Shareable Leaderboard **standings** payload cached under `['leaderboard', groupId, season,
 * 'standings', …]`. Only the season standings are cached — they are identical for every
 * member. The Weekly view's pick breakdown is deliberately NOT cached: it is read through
 * the user-scoped RLS client with a kickoff gate (so it differs per user and over time), so
 * it stays on the server `load` and is never cached or persisted (ADR-0017 boundary 3).
 */
export type LeaderboardCachePayload = {
  seasonYear: number;
  totals: SeasonLeaderboardEntry[];
  /** Keyset cursor for the next standings page; `null` when the first page holds everyone. */
  totalsCursor: string | null;
  /** Champion crown, shown only while viewing the current in-progress season. */
  championUserId: string | null;
  /** Drop-worst-week is active for THIS displayed season (ADR-0018): enabled, a start year
   *  is set, and `seasonYear >= startYear`. Drives the standings footnote. */
  dropActive: boolean;
};

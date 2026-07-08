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
import type {
  LeagueAts,
  LeagueSlate,
  LeagueTeamGameLog,
  LeagueTrends
} from '$lib/types/server/league';

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

/** One row of the All-time leaderboard: `stats_alltime_totals` plus a client-computed dense
 *  rank (`total_points desc, wins desc, pushes desc`, ties share a rank) and the member's
 *  avatar, joined by `user_id` in the read model since the matview has no `avatar_key`. */
export type AllTimeLeaderboardEntry = AllTimeTotalsEntry & {
  avatar_key: string | null;
  rank: number;
};

/**
 * All-time (career) standings payload cached under `['leaderboard', groupId, 0, 'alltime',
 * null, null]` — season-independent, so it is keyed the same regardless of the season the
 * Standings/Weekly tabs have selected (issue #376).
 */
export type AllTimeLeaderboardPayload = {
  totals: AllTimeLeaderboardEntry[];
  /** Group-level (cross-season) drop-worst-week flag (ADR-0018), same semantics as the Stats
   *  Career caption — every member's total already sums drop-aware season totals once this
   *  is true, regardless of which season a commissioner started the rule from. */
  dropActive: boolean;
};

/**
 * League-wide team ATS payload cached under `['league', season]` (issue #406). Group- and
 * user-independent — the same descriptive, league-wide context for everyone — so it is keyed
 * by season alone and is freely shareable/persistable (ADR-0017).
 */
export type LeagueCachePayload = LeagueAts;

/**
 * The forward-looking League slate for the upcoming scoring week (issue #429). Week- and
 * line-sensitive, so — unlike `LeagueCachePayload` — it is cached under a distinct,
 * non-persisted `['league-slate', season]` root and revalidated on every load (ADR-0017), so
 * it always reflects the current line rather than a superseded one.
 */
export type LeagueSlatePayload = LeagueSlate;

/**
 * The pooled "Last N seasons" market-cuts payload for the /league Trends scope toggle (epic
 * #424). Group- and user-independent and season-independent (it spans the recent seasons), so
 * it is cached under a single `['league', 'trends']` key and is freely shareable/persistable
 * (ADR-0017). Fetched lazily — only when the user switches the Trends scope to multi-season.
 */
export type LeagueTrendsPayload = LeagueTrends;

/**
 * One team's season ATS game log cached under `['league', 'team', teamId, season]` (issue
 * #428). Lazily fetched when the /league drill-down opens; group- and user-independent like
 * the rest of the league surface, so it is freely shareable/persistable (ADR-0017).
 */
export type LeagueTeamGameLogPayload = LeagueTeamGameLog;

// Client query fetchers for the validated-param read routes (ADR-0017).
//
// Shared by the universal `+page.ts` SSR prefetch (passing SvelteKit's `fetch`) and the
// component `createQuery` (passing the global `fetch`), so both paths hit the same
// `/api/*` endpoint with identical params and cannot drift.
import type {
  StatsCachePayload,
  GroupCachePayload,
  LeaderboardCachePayload,
  AllTimeLeaderboardPayload,
  LeagueCachePayload,
  LeagueSlatePayload,
  LeagueTeamGameLogPayload,
  LeagueTrendsPayload,
  RecapCachePayload
} from './types';
import type { LiveScoresPayload } from '$lib/live/types';

type FetchFn = typeof fetch;

/** Live Sunday sweat scores (#386). Not a shareable root — deliberately never persisted to
 *  IndexedDB (it's ephemeral, display-only live data), so a cold relaunch never serves a
 *  stale board. Polled on a short interval only while a game is in its live window. */
export async function fetchLiveScores(fetchFn: FetchFn): Promise<LiveScoresPayload> {
  const res = await fetchFn('/api/live-scores');
  if (!res.ok) throw new Error(`Failed to load live scores (${res.status})`);
  return res.json() as Promise<LiveScoresPayload>;
}

export async function fetchStats(
  fetchFn: FetchFn,
  groupId: string,
  seasonYear: number
): Promise<StatsCachePayload> {
  const res = await fetchFn(
    `/api/stats?groupId=${encodeURIComponent(groupId)}&season=${seasonYear}`
  );
  if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
  return res.json() as Promise<StatsCachePayload>;
}

export async function fetchGroup(
  fetchFn: FetchFn,
  groupId: string,
  seasonYear: number
): Promise<GroupCachePayload> {
  const res = await fetchFn(
    `/api/group?groupId=${encodeURIComponent(groupId)}&season=${seasonYear}`
  );
  if (!res.ok) throw new Error(`Failed to load group (${res.status})`);
  return res.json() as Promise<GroupCachePayload>;
}

export async function fetchLeaderboard(
  fetchFn: FetchFn,
  groupId: string,
  seasonYear: number
): Promise<LeaderboardCachePayload> {
  const res = await fetchFn(
    `/api/leaderboard?groupId=${encodeURIComponent(groupId)}&season=${seasonYear}`
  );
  if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`);
  return res.json() as Promise<LeaderboardCachePayload>;
}

export async function fetchAllTimeLeaderboard(
  fetchFn: FetchFn,
  groupId: string
): Promise<AllTimeLeaderboardPayload> {
  const res = await fetchFn(`/api/leaderboard/alltime?groupId=${encodeURIComponent(groupId)}`);
  if (!res.ok) throw new Error(`Failed to load all-time leaderboard (${res.status})`);
  return res.json() as Promise<AllTimeLeaderboardPayload>;
}

/** League-wide team ATS (issue #406). No groupId — the data is identical for everyone. */
export async function fetchLeague(
  fetchFn: FetchFn,
  seasonYear: number
): Promise<LeagueCachePayload> {
  const res = await fetchFn(`/api/league?season=${seasonYear}`);
  if (!res.ok) throw new Error(`Failed to load league trends (${res.status})`);
  return res.json() as Promise<LeagueCachePayload>;
}

/** The forward-looking slate for the upcoming scoring week (issue #429). Week-sensitive, so
 *  its query revalidates on every load rather than serving the season cache. */
export async function fetchLeagueSlate(
  fetchFn: FetchFn,
  seasonYear: number
): Promise<LeagueSlatePayload> {
  const res = await fetchFn(`/api/league/slate?season=${seasonYear}`);
  if (!res.ok) throw new Error(`Failed to load league slate (${res.status})`);
  return res.json() as Promise<LeagueSlatePayload>;
}

/** Pooled "Last N seasons" market-cut trends (epic #424). No groupId and no season — the data
 *  is identical for everyone and spans the recent seasons. Fetched lazily when the Trends scope
 *  toggle switches to multi-season. */
export async function fetchLeagueTrends(fetchFn: FetchFn): Promise<LeagueTrendsPayload> {
  const res = await fetchFn('/api/league/trends');
  if (!res.ok) throw new Error(`Failed to load league trends (${res.status})`);
  return res.json() as Promise<LeagueTrendsPayload>;
}

/** One team's season ATS game log for the /league drill-down (issue #428). No groupId — the
 *  data is identical for everyone. */
export async function fetchLeagueTeamGameLog(
  fetchFn: FetchFn,
  teamId: number,
  seasonYear: number
): Promise<LeagueTeamGameLogPayload> {
  const res = await fetchFn(`/api/league/team?teamId=${teamId}&season=${seasonYear}`);
  if (!res.ok) throw new Error(`Failed to load team game log (${res.status})`);
  return res.json() as Promise<LeagueTeamGameLogPayload>;
}

export async function fetchRecap(
  fetchFn: FetchFn,
  groupId: string,
  seasonYear: number
): Promise<RecapCachePayload> {
  const res = await fetchFn(
    `/api/recap?groupId=${encodeURIComponent(groupId)}&season=${seasonYear}`
  );
  if (!res.ok) throw new Error(`Failed to load recap (${res.status})`);
  return res.json() as Promise<RecapCachePayload>;
}

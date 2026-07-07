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
  LeagueCachePayload
} from './types';

type FetchFn = typeof fetch;

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

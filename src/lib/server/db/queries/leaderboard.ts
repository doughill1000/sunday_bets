import { supabaseService } from '$lib/supabase/service';
import type { SeasonLeaderboardEntry, WeeklyCumulativeEntry } from '$lib/types/leaderboard';
import { clampLimit, decodeCursor, encodeCursor } from '$lib/server/pagination';

/** Opaque keyset cursor for the season leaderboard: the last row's ordering tuple. */
type SeasonLeaderboardCursor = { tp: number; w: number; p: number; u: string };

export type SeasonLeaderboardPage = {
  entries: SeasonLeaderboardEntry[];
  /** Pass back as `cursor` to fetch the next page; `null` when no more rows. */
  nextCursor: string | null;
};

export async function getCurrentSeasonYear(): Promise<number> {
  const { data, error } = await supabaseService
    .from('current_season_year')
    .select('season_year')
    .single();
  if (error) throw error;
  return data!.season_year as number;
}

export async function getSeasonLeaderboard(
  seasonYear: number,
  groupId: string
): Promise<SeasonLeaderboardEntry[]> {
  const { data, error } = await supabaseService
    .from('leaderboard_season_totals')
    .select('*')
    .eq('season_year', seasonYear)
    .eq('group_id', groupId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeasonLeaderboardEntry[];
}

/**
 * One bounded, keyset-paginated page of a group's season standings (issue #152).
 * Backed by the leaderboard_season_page RPC; pages are stable under inserts and each
 * read is a single index range scan regardless of group size. For real groups
 * (~6 members) the first page contains everyone, so existing output is unchanged.
 */
export async function getSeasonLeaderboardPage(
  seasonYear: number,
  groupId: string,
  opts: { limit?: number; cursor?: string | null } = {}
): Promise<SeasonLeaderboardPage> {
  const limit = clampLimit(opts.limit);
  const after = decodeCursor<SeasonLeaderboardCursor>(opts.cursor);

  // Fetch one extra row to detect a next page without a second round-trip.
  const { data, error } = await supabaseService.rpc('leaderboard_season_page', {
    p_group_id: groupId,
    p_season_year: seasonYear,
    p_limit: limit + 1,
    p_after_total_points: after?.tp,
    p_after_wins: after?.w,
    p_after_pushes: after?.p,
    p_after_user_id: after?.u
  });
  if (error) throw error;

  const rows = (data ?? []) as SeasonLeaderboardEntry[];
  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const last = entries[entries.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ tp: last.total_points, w: last.wins, p: last.pushes, u: last.user_id })
      : null;

  return { entries, nextCursor };
}

export async function getAvailableSeasons(groupId: string): Promise<number[]> {
  // Pushes the DISTINCT into SQL (group_season_years RPC) so the season-dropdown read
  // is bounded by season count, not members x seasons (issue #152).
  const { data, error } = await supabaseService.rpc('group_season_years', {
    p_group_id: groupId
  });
  if (error) throw error;
  return ((data ?? []) as number[]).slice().sort((a, b) => b - a);
}

export async function getWeeklyCumulative(
  seasonYear: number,
  groupId: string
): Promise<WeeklyCumulativeEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_season_trend')
    .select('*')
    .eq('season_year', seasonYear)
    .eq('group_id', groupId)
    .order('week_number', { ascending: true })
    .order('cumulative_rank_this_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyCumulativeEntry[];
}

import { supabaseService } from '$lib/supabase/service';
import type { LeagueHonors, SeasonHonor } from '$lib/types/honors';

// The six columns the honors UI needs from the league_completed_standings view.
const HONOR_COLUMNS = 'season_year, user_id, display_name, avatar_key, rank, total_points';

/**
 * Pure derivation of the three league honors from a group's completed-season standings.
 * Expects `rows` ordered by season_year DESC, then rank ASC (as the queries fetch them):
 *   - trophyCase    = every rank-1 row (already newest-first)
 *   - reigningChampion = rank 1 of the newest completed season (the first trophy)
 *   - woodenSpoon   = the max-rank (last) row of that same newest completed season
 * Kept separate from the fetch so it is unit-testable without a database.
 */
export function deriveLeagueHonors(rows: SeasonHonor[]): LeagueHonors {
  const trophyCase = rows.filter((r) => r.rank === 1);
  const reigningChampion = trophyCase[0] ?? null;

  const latestYear = rows[0]?.season_year ?? null;
  const latestRows = latestYear == null ? [] : rows.filter((r) => r.season_year === latestYear);
  // rows are rank ASC within a season, so the last one carries the max rank.
  const woodenSpoon = latestRows[latestRows.length - 1] ?? null;

  return { reigningChampion, trophyCase, woodenSpoon };
}

/**
 * All three league honors for a group, read from league_completed_standings (a plain view
 * over the leaderboard_season_totals matview, restricted to fully-graded seasons — #279,
 * ADR-0013). Group-scoped via the group_id filter on the service-role read (ADR-0002).
 */
export async function getLeagueHonors(groupId: string): Promise<LeagueHonors> {
  const { data, error } = await supabaseService
    .from('league_completed_standings')
    .select(HONOR_COLUMNS)
    .eq('group_id', groupId)
    .order('season_year', { ascending: false })
    .order('rank', { ascending: true });
  if (error) throw error;
  return deriveLeagueHonors((data ?? []) as SeasonHonor[]);
}

/**
 * The reigning champion (rank 1 of the most-recently-completed season) for a group, or null
 * before any season completes. Lightweight single-row read for the /leaderboard crown.
 */
export async function getReigningChampion(groupId: string): Promise<SeasonHonor | null> {
  const { data, error } = await supabaseService
    .from('league_completed_standings')
    .select(HONOR_COLUMNS)
    .eq('group_id', groupId)
    .eq('rank', 1)
    .order('season_year', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SeasonHonor | null) ?? null;
}

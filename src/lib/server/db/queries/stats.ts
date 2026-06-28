import { supabaseService } from '$lib/supabase/service';
import { getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
import type { Tables } from '$lib/types/supabase';
import type {
  AllTimeStats,
  AllTimeTotalsEntry,
  AllTimeTeamAccuracyEntry,
  AllTimeWeightAccuracyEntry,
  ConsensusStatsEntry,
  HeadToHeadEntry,
  SeasonStats,
  TeamAccuracyEntry,
  WeightAccuracyEntry
} from '$lib/types/server/stats';

type TeamAccuracyRow = Tables<'stats_accuracy_by_team'>;
type WeightAccuracyRow = Tables<'stats_accuracy_by_weight'>;
type HeadToHeadRow = Tables<'stats_head_to_head'>;
type AllTimeHeadToHeadRow = Tables<'stats_head_to_head_alltime'>;
type AllTimeTotalsRow = Tables<'stats_alltime_totals'>;
type AllTimeTeamRow = Tables<'stats_accuracy_by_team_alltime'>;
type AllTimeWeightRow = Tables<'stats_accuracy_by_weight_alltime'>;
// Narrowed shape for the partial select on group_pick_consensus.
type ConsensusPickRow = Pick<
  Tables<'group_pick_consensus'>,
  'user_id' | 'display_name' | 'consensus_pct' | 'is_minority' | 'graded_outcome'
>;

function toTeamAccuracy(row: TeamAccuracyRow): TeamAccuracyEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.season_year == null ||
    row.team_id == null ||
    row.team_name == null ||
    row.team_short_name == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.points == null
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    display_name: row.display_name,
    season_year: row.season_year,
    team_id: row.team_id,
    team_name: row.team_name,
    team_short_name: row.team_short_name,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    points: row.points,
    accuracy: row.accuracy
  };
}

function toWeightAccuracy(row: WeightAccuracyRow): WeightAccuracyEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.season_year == null ||
    row.weight == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.points == null
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    display_name: row.display_name,
    season_year: row.season_year,
    weight: row.weight,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    points: row.points,
    accuracy: row.accuracy
  };
}

function toHeadToHead(row: HeadToHeadRow | AllTimeHeadToHeadRow): HeadToHeadEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.opponent_user_id == null ||
    row.opponent_display_name == null ||
    row.games_compared == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.points == null ||
    row.opponent_points == null
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    display_name: row.display_name,
    opponent_user_id: row.opponent_user_id,
    opponent_display_name: row.opponent_display_name,
    games_compared: row.games_compared,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    points: row.points,
    opponent_points: row.opponent_points
  };
}

/** Aggregate per-pick consensus rows into per-user summaries for badge derivation. */
function aggregateConsensusRows(rows: ConsensusPickRow[]): ConsensusStatsEntry[] {
  const byUser = new Map<
    string,
    {
      user_id: string;
      display_name: string;
      decisions: number;
      sumConsensusPct: number;
      contrarian_picks: number;
      contrarian_wins: number;
    }
  >();

  for (const row of rows) {
    if (row.user_id == null || row.display_name == null) continue;
    const acc = byUser.get(row.user_id) ?? {
      user_id: row.user_id,
      display_name: row.display_name,
      decisions: 0,
      sumConsensusPct: 0,
      contrarian_picks: 0,
      contrarian_wins: 0
    };
    acc.decisions++;
    acc.sumConsensusPct += Number(row.consensus_pct ?? 0);
    if (row.is_minority) {
      acc.contrarian_picks++;
      if (row.graded_outcome === 'win') acc.contrarian_wins++;
    }
    byUser.set(row.user_id, acc);
  }

  return [...byUser.values()].map((acc) => ({
    user_id: acc.user_id,
    display_name: acc.display_name,
    decisions: acc.decisions,
    mean_consensus_pct: acc.decisions > 0 ? acc.sumConsensusPct / acc.decisions : 0,
    contrarian_picks: acc.contrarian_picks,
    contrarian_wins: acc.contrarian_wins
  }));
}

export async function getStatsForSeason(seasonYear: number, groupId: string): Promise<SeasonStats> {
  const [trend, teamResult, weightResult, headToHeadResult, consensusResult] = await Promise.all([
    getWeeklyCumulative(seasonYear, groupId),
    supabaseService
      .from('stats_accuracy_by_team')
      .select('*')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
      .order('display_name')
      .order('team_short_name'),
    supabaseService
      .from('stats_accuracy_by_weight')
      .select('*')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
      .order('display_name')
      .order('weight'),
    supabaseService
      .from('stats_head_to_head')
      .select('*')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
      .order('display_name')
      .order('opponent_display_name'),
    supabaseService
      .from('group_pick_consensus')
      .select('user_id, display_name, consensus_pct, is_minority, graded_outcome')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
  ]);

  if (teamResult.error) throw teamResult.error;
  if (weightResult.error) throw weightResult.error;
  if (headToHeadResult.error) throw headToHeadResult.error;
  if (consensusResult.error) throw consensusResult.error;

  return {
    trend,
    teamAccuracy: (teamResult.data ?? []).flatMap((row) => {
      const entry = toTeamAccuracy(row);
      return entry ? [entry] : [];
    }),
    weightAccuracy: (weightResult.data ?? []).flatMap((row) => {
      const entry = toWeightAccuracy(row);
      return entry ? [entry] : [];
    }),
    headToHead: (headToHeadResult.data ?? []).flatMap((row) => {
      const entry = toHeadToHead(row);
      return entry ? [entry] : [];
    }),
    consensusStats: aggregateConsensusRows(consensusResult.data ?? [])
  };
}

function toAllTimeTotals(row: AllTimeTotalsRow): AllTimeTotalsEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.total_points == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.missed == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    total_points: row.total_points,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    missed: row.missed
  };
}

function toAllTimeTeamAccuracy(row: AllTimeTeamRow): AllTimeTeamAccuracyEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.team_id == null ||
    row.team_name == null ||
    row.team_short_name == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.points == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    team_id: row.team_id,
    team_name: row.team_name,
    team_short_name: row.team_short_name,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    points: row.points,
    accuracy: row.accuracy
  };
}

function toAllTimeWeightAccuracy(row: AllTimeWeightRow): AllTimeWeightAccuracyEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.weight == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null ||
    row.points == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    weight: row.weight as AllTimeWeightAccuracyEntry['weight'],
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    points: row.points,
    accuracy: row.accuracy
  };
}

/**
 * All-time per-player totals only. Split out from the detail breakdowns (#perf) because
 * the `/stats` load needs totals eagerly (player selector + the career-tab gate), while
 * the heavier team/weight/head-to-head detail can stream after first paint via
 * {@link getAllTimeDetail}.
 */
export async function getAllTimeTotals(groupId: string): Promise<AllTimeTotalsEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_alltime_totals')
    .select('*')
    .eq('group_id', groupId)
    .order('display_name');
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const entry = toAllTimeTotals(row);
    return entry ? [entry] : [];
  });
}

/**
 * The heavier all-time accuracy breakdowns (team, weight, head-to-head) that back the
 * Career and Head-to-head tabs. Returned un-awaited from the stats load so SvelteKit
 * streams them off the critical path; the default Season tab never needs them.
 */
export async function getAllTimeDetail(
  groupId: string
): Promise<Omit<AllTimeStats, 'allTimeTotals'>> {
  const [teamResult, weightResult, headToHeadResult] = await Promise.all([
    supabaseService
      .from('stats_accuracy_by_team_alltime')
      .select('*')
      .eq('group_id', groupId)
      .order('display_name')
      .order('team_short_name'),
    supabaseService
      .from('stats_accuracy_by_weight_alltime')
      .select('*')
      .eq('group_id', groupId)
      .order('display_name')
      .order('weight'),
    supabaseService
      .from('stats_head_to_head_alltime')
      .select('*')
      .eq('group_id', groupId)
      .order('display_name')
      .order('opponent_display_name')
  ]);

  if (teamResult.error) throw teamResult.error;
  if (weightResult.error) throw weightResult.error;
  if (headToHeadResult.error) throw headToHeadResult.error;

  return {
    allTimeTeamAccuracy: (teamResult.data ?? []).flatMap((row) => {
      const entry = toAllTimeTeamAccuracy(row);
      return entry ? [entry] : [];
    }),
    allTimeWeightAccuracy: (weightResult.data ?? []).flatMap((row) => {
      const entry = toAllTimeWeightAccuracy(row);
      return entry ? [entry] : [];
    }),
    allTimeHeadToHead: (headToHeadResult.data ?? []).flatMap((row) => {
      const entry = toHeadToHead(row);
      return entry ? [entry] : [];
    })
  };
}

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
  LeagueSituationalBaselineEntry,
  LineSideStatsEntry,
  SituationalDimension,
  SituationalSplitEntry,
  StreakStatsEntry,
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
type LineSideRow = Tables<'stats_accuracy_by_line_side'>;
type StreakRow = Tables<'stats_pick_streaks'>;
type SituationalSplitRow = Tables<'stats_situational_splits'>;
type LeagueSituationalBaselineRow = Tables<'league_situational_baseline'>;
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
      majority_picks: number;
      majority_wins: number;
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
      contrarian_wins: 0,
      majority_picks: 0,
      majority_wins: 0
    };
    acc.decisions++;
    acc.sumConsensusPct += Number(row.consensus_pct ?? 0);
    if (row.is_minority) {
      acc.contrarian_picks++;
      if (row.graded_outcome === 'win') acc.contrarian_wins++;
    } else {
      acc.majority_picks++;
      if (row.graded_outcome === 'win') acc.majority_wins++;
    }
    byUser.set(row.user_id, acc);
  }

  return [...byUser.values()].map((acc) => ({
    user_id: acc.user_id,
    display_name: acc.display_name,
    decisions: acc.decisions,
    mean_consensus_pct: acc.decisions > 0 ? acc.sumConsensusPct / acc.decisions : 0,
    contrarian_picks: acc.contrarian_picks,
    contrarian_wins: acc.contrarian_wins,
    majority_picks: acc.majority_picks,
    majority_wins: acc.majority_wins
  }));
}

function toLineSide(row: LineSideRow): LineSideStatsEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.decisions == null ||
    row.chalk_picks == null ||
    row.dog_picks == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    decisions: row.decisions,
    chalk_picks: row.chalk_picks,
    dog_picks: row.dog_picks
  };
}

function toStreak(row: StreakRow): StreakStatsEntry | null {
  if (
    row.user_id == null ||
    row.display_name == null ||
    row.graded_picks == null ||
    row.current_streak == null ||
    row.max_streak == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    graded_picks: row.graded_picks,
    current_streak: row.current_streak,
    max_streak: row.max_streak
  };
}

function toSituationalSplit(row: SituationalSplitRow): SituationalSplitEntry | null {
  if (
    row.user_id == null ||
    row.dimension == null ||
    row.bucket == null ||
    row.bucket_order == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null
  ) {
    return null;
  }
  return {
    user_id: row.user_id,
    dimension: row.dimension as SituationalDimension,
    bucket: row.bucket,
    bucket_order: row.bucket_order,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    accuracy: row.accuracy
  };
}

function toLeagueSituationalBaseline(
  row: LeagueSituationalBaselineRow
): LeagueSituationalBaselineEntry | null {
  if (
    row.dimension == null ||
    row.bucket == null ||
    row.bucket_order == null ||
    row.decisions == null ||
    row.wins == null ||
    row.losses == null ||
    row.pushes == null
  ) {
    return null;
  }
  return {
    dimension: row.dimension as SituationalDimension,
    bucket: row.bucket,
    bucket_order: row.bucket_order,
    decisions: row.decisions,
    wins: row.wins,
    losses: row.losses,
    pushes: row.pushes,
    accuracy: row.accuracy
  };
}

/**
 * Per-user career situational ATS splits for the whole group (issue #502). Career-grain (all
 * seasons pooled), so — like {@link getAllTimeTotals} — it takes only a group id and the "Your
 * edge" panel filters to the selected player client-side.
 */
export async function getSituationalSplits(groupId: string): Promise<SituationalSplitEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_situational_splits')
    .select('*')
    .eq('group_id', groupId)
    .order('user_id')
    .order('dimension')
    .order('bucket_order');
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const entry = toSituationalSplit(row);
    return entry ? [entry] : [];
  });
}

/**
 * League-wide market ATS cover baseline per situational cut (issue #502). Group- and
 * user-independent — identical for everyone — so it takes no arguments; the panel subtracts it
 * from each player's own per-cut cover rate to compute the edge.
 */
export async function getLeagueSituationalBaseline(): Promise<LeagueSituationalBaselineEntry[]> {
  const { data, error } = await supabaseService
    .from('league_situational_baseline')
    .select('*')
    .order('dimension')
    .order('bucket_order');
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const entry = toLeagueSituationalBaseline(row);
    return entry ? [entry] : [];
  });
}

export async function getStatsForSeason(seasonYear: number, groupId: string): Promise<SeasonStats> {
  const [
    trend,
    teamResult,
    weightResult,
    headToHeadResult,
    consensusResult,
    lineSideResult,
    streakResult
  ] = await Promise.all([
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
      .eq('group_id', groupId),
    supabaseService
      .from('stats_accuracy_by_line_side')
      .select('*')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
      .order('display_name'),
    supabaseService
      .from('stats_pick_streaks')
      .select('*')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
      .order('display_name')
  ]);

  if (teamResult.error) throw teamResult.error;
  if (weightResult.error) throw weightResult.error;
  if (headToHeadResult.error) throw headToHeadResult.error;
  if (consensusResult.error) throw consensusResult.error;
  if (lineSideResult.error) throw lineSideResult.error;
  if (streakResult.error) throw streakResult.error;

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
    consensusStats: aggregateConsensusRows(consensusResult.data ?? []),
    lineSide: (lineSideResult.data ?? []).flatMap((row) => {
      const entry = toLineSide(row);
      return entry ? [entry] : [];
    }),
    streaks: (streakResult.data ?? []).flatMap((row) => {
      const entry = toStreak(row);
      return entry ? [entry] : [];
    })
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

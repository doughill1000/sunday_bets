import { supabaseService } from '$lib/supabase/service';
import { getWeeklyCumulative } from '$lib/server/db/queries/leaderboard';
import type { Tables } from '$lib/types/supabase';
import type {
  AllTimeStats,
  AllTimeTotalsEntry,
  AllTimeTeamAccuracyEntry,
  AllTimeWeightAccuracyEntry,
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

export async function getStatsForSeason(seasonYear: number, groupId: string): Promise<SeasonStats> {
  const [trend, teamResult, weightResult, headToHeadResult] = await Promise.all([
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
      .order('opponent_display_name')
  ]);

  if (teamResult.error) throw teamResult.error;
  if (weightResult.error) throw weightResult.error;
  if (headToHeadResult.error) throw headToHeadResult.error;

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

export async function getAllTimeStats(groupId: string): Promise<AllTimeStats> {
  const [totalsResult, teamResult, weightResult, headToHeadResult] = await Promise.all([
    supabaseService
      .from('stats_alltime_totals')
      .select('*')
      .eq('group_id', groupId)
      .order('display_name'),
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

  if (totalsResult.error) throw totalsResult.error;
  if (teamResult.error) throw teamResult.error;
  if (weightResult.error) throw weightResult.error;
  if (headToHeadResult.error) throw headToHeadResult.error;

  return {
    allTimeTotals: (totalsResult.data ?? []).flatMap((row) => {
      const entry = toAllTimeTotals(row);
      return entry ? [entry] : [];
    }),
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

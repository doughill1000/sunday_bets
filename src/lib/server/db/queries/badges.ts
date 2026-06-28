import { supabaseService } from '$lib/supabase/service';
import { computeBadges } from '$lib/domain/badges';
import type { BadgeAward } from '$lib/types/honors';
import type {
  BadgeInputs,
  BadgeSeasonTotalsEntry,
  BadgeWeightEntry,
  BadgeH2HEntry,
  BadgeTeamEntry,
  BadgeTrendEntry
} from '$lib/domain/badges';

/** All identity badges for a group's season, derived from existing settled-stats matviews. */
export async function getBadges(seasonYear: number, groupId: string): Promise<BadgeAward[]> {
  const [totalsResult, weightResult, h2hResult, teamResult, trendResult] = await Promise.all([
    supabaseService
      .from('leaderboard_season_totals')
      .select('user_id,display_name,decisions,wins,losses,pushes,missed')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId),
    supabaseService
      .from('stats_accuracy_by_weight')
      .select('user_id,display_name,weight,decisions,wins,losses,pushes')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId),
    supabaseService
      .from('stats_head_to_head')
      .select('user_id,display_name,opponent_user_id,games_compared,wins,losses')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId),
    supabaseService
      .from('stats_accuracy_by_team')
      .select('user_id,display_name,team_id,decisions,wins,losses')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId),
    supabaseService
      .from('stats_season_trend')
      .select('user_id,display_name,week_number,week_wins,week_losses,week_missed')
      .eq('season_year', seasonYear)
      .eq('group_id', groupId)
  ]);

  if (totalsResult.error) throw totalsResult.error;
  if (weightResult.error) throw weightResult.error;
  if (h2hResult.error) throw h2hResult.error;
  if (teamResult.error) throw teamResult.error;
  if (trendResult.error) throw trendResult.error;

  const inputs: BadgeInputs = {
    seasonTotals: (totalsResult.data ?? []).flatMap((row): BadgeSeasonTotalsEntry[] => {
      if (
        !row.user_id ||
        !row.display_name ||
        row.decisions == null ||
        row.wins == null ||
        row.losses == null ||
        row.pushes == null ||
        row.missed == null
      )
        return [];
      return [
        {
          user_id: row.user_id,
          display_name: row.display_name,
          decisions: row.decisions,
          wins: row.wins,
          losses: row.losses,
          pushes: row.pushes,
          missed: row.missed
        }
      ];
    }),

    weightAccuracy: (weightResult.data ?? []).flatMap((row): BadgeWeightEntry[] => {
      if (
        !row.user_id ||
        !row.display_name ||
        !row.weight ||
        row.decisions == null ||
        row.wins == null ||
        row.losses == null ||
        row.pushes == null
      )
        return [];
      return [
        {
          user_id: row.user_id,
          display_name: row.display_name,
          weight: row.weight,
          decisions: row.decisions,
          wins: row.wins,
          losses: row.losses,
          pushes: row.pushes
        }
      ];
    }),

    headToHead: (h2hResult.data ?? []).flatMap((row): BadgeH2HEntry[] => {
      if (
        !row.user_id ||
        !row.display_name ||
        !row.opponent_user_id ||
        row.games_compared == null ||
        row.wins == null ||
        row.losses == null
      )
        return [];
      return [
        {
          user_id: row.user_id,
          display_name: row.display_name,
          opponent_user_id: row.opponent_user_id,
          games_compared: row.games_compared,
          wins: row.wins,
          losses: row.losses
        }
      ];
    }),

    teamAccuracy: (teamResult.data ?? []).flatMap((row): BadgeTeamEntry[] => {
      if (
        !row.user_id ||
        !row.display_name ||
        row.team_id == null ||
        row.decisions == null ||
        row.wins == null ||
        row.losses == null
      )
        return [];
      return [
        {
          user_id: row.user_id,
          display_name: row.display_name,
          team_id: row.team_id,
          decisions: row.decisions,
          wins: row.wins,
          losses: row.losses
        }
      ];
    }),

    trend: (trendResult.data ?? []).flatMap((row): BadgeTrendEntry[] => {
      if (
        !row.user_id ||
        !row.display_name ||
        row.week_number == null ||
        row.week_wins == null ||
        row.week_losses == null ||
        row.week_missed == null
      )
        return [];
      return [
        {
          user_id: row.user_id,
          display_name: row.display_name,
          week_number: row.week_number,
          week_wins: row.week_wins,
          week_losses: row.week_losses,
          week_missed: row.week_missed
        }
      ];
    })
  };

  return computeBadges(inputs);
}

// Read-side data hooks. Every query here goes straight to Supabase under RLS with the
// user's session — the same tables/views the web app reads (see the web queries in
// src/lib/server/db/queries/), minus anything gated to the service role.
import { useQuery } from '@tanstack/react-query';

import type { DropWorstWeekRules } from '@/domain/scoring';
import type { SettlementFact, UserMeta } from '@/domain/leaderboard';
import type { GroupPickEntry, PickEntry, PickGame, Settlement } from '@/domain/types';
import { supabase } from './supabase';

export type ActiveWeek = {
  id: number;
  weekNumber: number;
  seasonId: number;
  seasonYear: number;
  isLastWeek: boolean;
};

/**
 * Resolve the week to show on the picks board — mirrors the web's
 * getActiveWeekGames(): the week whose [start_ts, end_ts] window contains now,
 * falling back to the most recently started week (e.g. during the offseason).
 */
export function useActiveWeek() {
  return useQuery({
    queryKey: ['active-week'],
    queryFn: async (): Promise<ActiveWeek | null> => {
      const now = new Date().toISOString();
      const selectCols = 'id, week_number, season_id, seasons!weeks_season_id_fkey(year)';

      const inWindow = await supabase
        .from('weeks')
        .select(selectCols)
        .lte('start_ts', now)
        .gte('end_ts', now)
        .order('start_ts', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inWindow.error) throw inWindow.error;

      let week = inWindow.data;
      if (!week) {
        const latestStarted = await supabase
          .from('weeks')
          .select(selectCols)
          .lte('start_ts', now)
          .order('start_ts', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestStarted.error) throw latestStarted.error;
        week = latestStarted.data;
      }
      if (!week) return null;

      const lastWeek = await supabase
        .from('weeks')
        .select('week_number')
        .eq('season_id', week.season_id)
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastWeek.error) throw lastWeek.error;

      return {
        id: week.id,
        weekNumber: week.week_number,
        seasonId: week.season_id,
        seasonYear: week.seasons?.year ?? new Date().getFullYear(),
        isLastWeek: lastWeek.data?.week_number === week.week_number
      };
    }
  });
}

export type GroupConfig = {
  lineSource: string;
  scoringRules: DropWorstWeekRules;
};

export function useGroupConfig(groupId: string | null) {
  return useQuery({
    queryKey: ['group-config', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupConfig> => {
      const { data, error } = await supabase
        .from('group_config')
        .select('line_source, scoring_rules')
        .eq('group_id', groupId!)
        .maybeSingle();
      if (error) throw error;
      return {
        // Default mirrors lock_pick_all_groups: groups without config use fanduel.
        lineSource: data?.line_source ?? 'fanduel',
        scoringRules: (data?.scoring_rules as DropWorstWeekRules) ?? null
      };
    }
  });
}

function parseFinalScores(raw: unknown): { home: number; away: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.home !== 'number' || typeof obj.away !== 'number') return null;
  return { home: obj.home, away: obj.away };
}

/**
 * Week games with each game's active line for the group's line source. The web app
 * reads the ui_games view via the service role; that view carries no client grant,
 * so we recompose it from games + game_lines + teams (all authenticated-readable).
 */
export function useWeekGames(weekId: number | null | undefined, lineSource: string | undefined) {
  return useQuery({
    queryKey: ['week-games', weekId, lineSource],
    enabled: weekId != null && !!lineSource,
    queryFn: async (): Promise<PickGame[]> => {
      // NOTE: must stay a single string literal — concatenation widens the type to
      // `string`, which defeats supabase-js's select-string parser and untypes the rows.
      const { data, error } = await supabase
        .from('games')
        .select(
          `id, week_id, commence_time, status, final_scores, home_team_id, away_team_id,
           home:teams!games_home_team_id_fkey(short_name),
           away:teams!games_away_team_id_fkey(short_name),
           game_lines(id, spread_team_id, spread_value, source, is_active_line, fetched_at)`
        )
        .eq('week_id', weekId!)
        .eq('game_lines.is_active_line', true)
        .eq('game_lines.source', lineSource!)
        .order('commence_time');
      if (error) throw error;

      return (data ?? []).map((g) => {
        // Latest active line wins — same ordering lock_pick_all_groups snapshots by.
        const line = [...g.game_lines].sort(
          (a, b) =>
            new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime() || b.id - a.id
        )[0];
        return {
          id: g.id,
          kickoff: g.commence_time,
          home: g.home?.short_name ?? '?',
          away: g.away?.short_name ?? '?',
          homeTeamId: g.home_team_id,
          awayTeamId: g.away_team_id,
          spreadTeamId: line?.spread_team_id ?? null,
          spreadValue: line?.spread_value ?? null,
          status: g.status,
          finalScores: parseFinalScores(g.final_scores)
        };
      });
    }
  });
}

/** My picks for the board — same view + filters the web getMyPicks uses. */
export function useMyPicks(weekId: number | null | undefined, groupId: string | null) {
  return useQuery({
    queryKey: ['my-picks', weekId, groupId],
    enabled: weekId != null && !!groupId,
    queryFn: async (): Promise<Record<string, PickEntry>> => {
      const { data, error } = await supabase
        .from('picks_status_view_user')
        .select(
          'game_id, picked_side, weight, locked_at, locked_spread_value, locked_spread_team_id'
        )
        .eq('week_id', weekId!)
        .eq('group_id', groupId!);
      if (error) throw error;

      const byGame: Record<string, PickEntry> = {};
      for (const r of data ?? []) {
        if (!r.game_id) continue;
        byGame[r.game_id] = {
          lockedPick:
            r.picked_side && r.weight ? { team: r.picked_side, weight: r.weight } : undefined,
          lockedAt: r.locked_at ?? undefined,
          lockedSpreadValue: r.locked_spread_value ?? undefined,
          lockedSpreadTeamId: r.locked_spread_team_id ?? undefined
        };
      }
      return byGame;
    }
  });
}

/** Group members' picks; RLS reveals other players' rows only after kickoff. */
export function useGroupPicks(weekId: number | null | undefined, groupId: string | null) {
  return useQuery({
    queryKey: ['group-picks', weekId, groupId],
    enabled: weekId != null && !!groupId,
    queryFn: async (): Promise<GroupPickEntry[]> => {
      const { data, error } = await supabase
        .from('picks_group_view')
        .select(
          'user_id, display_name, avatar_key, game_id, picked_side, weight, picked_team_short'
        )
        .eq('week_id', weekId!)
        .eq('group_id', groupId!);
      if (error) throw error;
      return (data ?? []).flatMap((r) =>
        r.user_id && r.game_id
          ? [
              {
                userId: r.user_id,
                displayName: r.display_name,
                avatarKey: r.avatar_key,
                gameId: r.game_id,
                pickedSide: r.picked_side,
                weight: r.weight,
                pickedTeamShort: r.picked_team_short
              }
            ]
          : []
      );
    }
  });
}

/** My graded results for the week's games (win/loss/push/missed + points). */
export function useMySettlements(
  weekId: number | null | undefined,
  groupId: string | null,
  userId: string | null
) {
  return useQuery({
    queryKey: ['my-settlements', weekId, groupId, userId],
    enabled: weekId != null && !!groupId && !!userId,
    queryFn: async (): Promise<Record<string, Settlement>> => {
      const { data, error } = await supabase
        .from('pick_settlement')
        .select('game_id, outcome, points_delta, games!inner(week_id)')
        .eq('group_id', groupId!)
        .eq('user_id', userId!)
        .eq('games.week_id', weekId!);
      if (error) throw error;
      const byGame: Record<string, Settlement> = {};
      for (const r of data ?? []) {
        byGame[r.game_id] = {
          gameId: r.game_id,
          outcome: r.outcome,
          pointsDelta: r.points_delta
        };
      }
      return byGame;
    }
  });
}

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async (): Promise<{ id: number; year: number }[]> => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, year')
        .order('year', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });
}

export type SeasonFacts = {
  facts: SettlementFact[];
  users: Map<string, UserMeta>;
};

/**
 * Raw season facts for the standings: every settled decision in the group's scoring
 * weeks for one season, plus display metadata for the players involved. Aggregation
 * happens client-side (see src/domain/leaderboard.ts) because the precomputed
 * leaderboard matview is service-role-only (ADR-0002).
 */
export function useSeasonFacts(groupId: string | null, seasonYear: number | null) {
  return useQuery({
    queryKey: ['season-facts', groupId, seasonYear],
    enabled: !!groupId && seasonYear != null,
    queryFn: async (): Promise<SeasonFacts> => {
      // Page through PostgREST's max-rows window (a full season for a big group can
      // exceed 1000 rows). Ordered by the primary key so pages are stable.
      const pageSize = 1000;
      const facts: SettlementFact[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('pick_settlement')
          .select(
            'user_id, points_delta, outcome, games!inner(week_id, weeks!inner(is_scoring, seasons!inner(year)))'
          )
          .eq('group_id', groupId!)
          .eq('games.weeks.seasons.year', seasonYear!)
          .eq('games.weeks.is_scoring', true)
          .order('user_id')
          .order('game_id')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          facts.push({
            userId: r.user_id,
            weekId: r.games.week_id,
            pointsDelta: r.points_delta ?? 0,
            outcome: r.outcome
          });
        }
        if (!data || data.length < pageSize) break;
      }

      const userIds = [...new Set(facts.map((f) => f.userId))];
      const users = new Map<string, UserMeta>();
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, display_name, avatar_key')
          .in('id', userIds);
        if (error) throw error;
        for (const u of data ?? []) {
          users.set(u.id, { displayName: u.display_name, avatarKey: u.avatar_key });
        }
      }
      return { facts, users };
    }
  });
}

export type GroupMember = {
  userId: string;
  role: string;
  joinedAt: string;
  displayName: string | null;
  avatarKey: string | null;
};

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          'user_id, role, joined_at, users!group_memberships_user_id_fkey(display_name, avatar_key)'
        )
        .eq('group_id', groupId!)
        .eq('status', 'active')
        .order('joined_at');
      if (error) throw error;
      return (data ?? []).map((m) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        displayName: m.users?.display_name ?? null,
        avatarKey: m.users?.avatar_key ?? null
      }));
    }
  });
}

export type MyProfile = {
  displayName: string | null;
  avatarKey: string | null;
  role: string | null;
};

export function useMyProfile(userId: string | null) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyProfile> => {
      const { data, error } = await supabase
        .from('users')
        .select('display_name, avatar_key, role')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return {
        displayName: data?.display_name ?? null,
        avatarKey: data?.avatar_key ?? null,
        role: data?.role ?? null
      };
    }
  });
}

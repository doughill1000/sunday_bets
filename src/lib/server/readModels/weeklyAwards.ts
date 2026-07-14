// Weekly-hardware read model (issue #387): assembles the pure weekly-award engine's
// inputs from the ADR-0013 matviews for one (group, season), gates them to the weeks
// that have FULLY graded, and returns the per-week hardware plus the season shelf.
//
// Read-only, service-role (matviews carry no RLS). The group/season scoping is applied
// on every read, so a caller only ever sees its own group's awards.
import { supabaseService } from '$lib/supabase/service';
import {
  computeWeeklyHardware,
  computeSeasonShelf,
  type WeeklyPointsEntry,
  type WeeklyCoverEntry,
  type WeeklyConsensusEntry
} from '$lib/domain/weeklyAwards';
import type { SeasonWeeklyAwards } from '$lib/types/server/weeklyAwards';

type PickOutcome = 'win' | 'loss' | 'push' | 'missed';

/**
 * The scoring weeks of this season that have fully graded — every game has a final. A
 * partially-graded week is excluded so mid-week grade runs never crown a premature Game
 * Ball of the Week. Mirrors `isWeekFullyGraded` (notifications.ts) at the season grain.
 */
async function fullyGradedScoringWeeks(seasonYear: number): Promise<Set<number>> {
  const { data: weeks, error: weeksErr } = await supabaseService
    .from('weeks')
    .select('id, week_number, is_scoring, seasons!inner(year)')
    .eq('seasons.year', seasonYear)
    .eq('is_scoring', true);
  if (weeksErr) throw weeksErr;

  const weekNumberById = new Map<number, number>();
  for (const w of weeks ?? []) weekNumberById.set(w.id, w.week_number);
  const weekIds = [...weekNumberById.keys()];
  if (weekIds.length === 0) return new Set();

  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('week_id, final_scores')
    .in('week_id', weekIds);
  if (gamesErr) throw gamesErr;

  // A week is complete iff it has at least one game and none is missing a final.
  const total = new Map<number, number>();
  const missing = new Map<number, number>();
  for (const g of games ?? []) {
    total.set(g.week_id, (total.get(g.week_id) ?? 0) + 1);
    if (g.final_scores == null) missing.set(g.week_id, (missing.get(g.week_id) ?? 0) + 1);
  }

  const complete = new Set<number>();
  for (const weekId of weekIds) {
    const weekNumber = weekNumberById.get(weekId) as number;
    if ((total.get(weekId) ?? 0) > 0 && (missing.get(weekId) ?? 0) === 0) complete.add(weekNumber);
  }
  return complete;
}

async function loadPoints(groupId: string, seasonYear: number): Promise<WeeklyPointsEntry[]> {
  const { data, error } = await supabaseService
    .from('stats_season_trend')
    .select('user_id, display_name, week_number, week_points')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  const rows: WeeklyPointsEntry[] = [];
  for (const r of data ?? []) {
    if (
      r.user_id == null ||
      r.display_name == null ||
      r.week_number == null ||
      r.week_points == null
    )
      continue;
    rows.push({
      user_id: r.user_id,
      display_name: r.display_name,
      week_number: r.week_number,
      week_points: r.week_points
    });
  }
  return rows;
}

async function loadCovers(groupId: string, seasonYear: number): Promise<WeeklyCoverEntry[]> {
  const { data, error } = await supabaseService
    .from('group_pick_cover')
    .select('user_id, display_name, week_number, game_id, outcome, cover_margin')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  const rows: WeeklyCoverEntry[] = [];
  for (const r of data ?? []) {
    if (
      r.user_id == null ||
      r.display_name == null ||
      r.week_number == null ||
      r.game_id == null ||
      r.outcome == null ||
      r.cover_margin == null
    )
      continue;
    rows.push({
      user_id: r.user_id,
      display_name: r.display_name,
      week_number: r.week_number,
      game_id: r.game_id,
      outcome: r.outcome as PickOutcome,
      cover_margin: Number(r.cover_margin)
    });
  }
  return rows;
}

async function loadConsensus(groupId: string, seasonYear: number): Promise<WeeklyConsensusEntry[]> {
  const { data, error } = await supabaseService
    .from('group_pick_consensus')
    .select(
      'user_id, display_name, week_number, game_id, consensus_pct, is_minority, graded_outcome'
    )
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  const rows: WeeklyConsensusEntry[] = [];
  for (const r of data ?? []) {
    if (
      r.user_id == null ||
      r.display_name == null ||
      r.week_number == null ||
      r.game_id == null ||
      r.consensus_pct == null ||
      r.is_minority == null ||
      r.graded_outcome == null
    )
      continue;
    rows.push({
      user_id: r.user_id,
      display_name: r.display_name,
      week_number: r.week_number,
      game_id: r.game_id,
      consensus_pct: Number(r.consensus_pct),
      is_minority: r.is_minority,
      outcome: r.graded_outcome as PickOutcome
    });
  }
  return rows;
}

/**
 * Every fully-graded scoring week's four awards (newest first) plus the season shelf,
 * for one group and season. Awards are cosmetic and derived on read (like season badges):
 * no award rows are persisted.
 */
export async function getSeasonWeeklyAwards(
  groupId: string,
  seasonYear: number
): Promise<SeasonWeeklyAwards> {
  const [completeWeeks, points, covers, consensus] = await Promise.all([
    fullyGradedScoringWeeks(seasonYear),
    loadPoints(groupId, seasonYear),
    loadCovers(groupId, seasonYear),
    loadConsensus(groupId, seasonYear)
  ]);

  const weeks = computeWeeklyHardware({
    points: points.filter((p) => completeWeeks.has(p.week_number)),
    covers: covers.filter((c) => completeWeeks.has(c.week_number)),
    consensus: consensus.filter((c) => completeWeeks.has(c.week_number))
  });

  return { season_year: seasonYear, weeks, shelf: computeSeasonShelf(weeks) };
}

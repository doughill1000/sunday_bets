import { supabaseService } from '$lib/supabase/service';
import type { RequestEvent } from '@sveltejs/kit';
import { getGroupPicks } from '$lib/server/db/queries/getGroupPicks';
import { getGamesForWeeksWithScores } from '$lib/server/db/queries/getGamesForWeeksWithScores';
import { getPlayers } from '$lib/server/db/queries/getPlayers';
import type { SeasonWeekOption, WeeklyGameBreakdown, Settlement } from '$lib/types/leaderboard';
import { assembleWeeklyBreakdown } from '$lib/utils/weeklyPicks';
import type { GameInputRow } from '$lib/utils/weeklyPicks';

export async function getSeasonWeekOptions(seasonYear: number): Promise<SeasonWeekOption[]> {
  const { data: season, error: seasonErr } = await supabaseService
    .from('seasons')
    .select('id')
    .eq('year', seasonYear)
    .single();

  if (seasonErr || !season) return [];

  const now = new Date().toISOString();
  // Include non-scoring rounds (preseason / practice, ADR-0016) so their graded results are
  // viewable; the matviews exclude them from standings and the UI labels them. Order by
  // start_ts so preseason (negative week_number) still sorts chronologically before week 1.
  const { data: weeks, error: weeksErr } = await supabaseService
    .from('weeks')
    .select('id, week_number, is_scoring')
    .eq('season_id', season.id)
    .lte('start_ts', now)
    .order('start_ts', { ascending: true });

  if (weeksErr) throw weeksErr;

  return (weeks ?? []).map((w) => ({
    weekNumber: w.week_number,
    weekId: w.id,
    isScoring: w.is_scoring
  }));
}

export async function getWeeklyPickBreakdown(
  event: RequestEvent,
  weekId: number,
  groupId: string,
  currentUserId: string | null
): Promise<WeeklyGameBreakdown[]> {
  // getGroupPicks uses event.locals.supabase (user-scoped) → picks_group_view (RLS + kickoff gate)
  const [gamesResult, groupPicks, players] = await Promise.all([
    getGamesForWeeksWithScores([weekId]),
    getGroupPicks(event, weekId, groupId),
    getPlayers(groupId)
  ]);

  if (gamesResult.error) throw gamesResult.error;
  const games = gamesResult.data ?? [];
  const gameIds = games.map((g) => g.id);

  // Settlements are safe via service role: they only exist after a game is graded (post-kickoff).
  let settlements: Settlement[] = [];
  if (gameIds.length > 0) {
    const { data: settData, error: settErr } = await supabaseService
      .from('pick_settlement')
      .select('user_id, game_id, points_delta, outcome')
      .in('game_id', gameIds)
      .eq('group_id', groupId);

    if (settErr) throw settErr;
    settlements = (settData ?? []) as Settlement[];
  }

  return assembleWeeklyBreakdown(
    games as unknown as GameInputRow[],
    groupPicks,
    settlements,
    players,
    currentUserId
  );
}

// GET /api/cron/demo-snapshot — assemble the public demo-season snapshot (#460, ADR-0026).
//
// Cron-secret-guarded internal export tool, NOT a public surface. It runs inside the app
// runtime so it can reuse the real read-model / query / Wrapped-generation layer (all of which
// import `$env` and so cannot be imported by a standalone script) and — when pointed at an
// environment that has the AI Gateway creds (Vercel) — make the real LLM calls the frozen
// recap/Wrapped prose is baked from. The `pnpm demo:snapshot` script POSTs/GETs this and writes
// the returned JSON to `src/lib/server/demo/demo-snapshot.json`.
//
// It reads a designated fictional group / completed season / persona from whatever DB the app
// is connected to (locally: the `db:seed:demo` league). Nothing here writes to gameplay tables
// except `generateSeasonWrapped`, which persists the demo group's own Wrapped rows (idempotent,
// completeness-gated) — never real-user data.
import { json, type RequestHandler } from '@sveltejs/kit';
import { requireCronSecret } from '$lib/server/cron';
import { supabaseService } from '$lib/supabase/service';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';
import {
  getLeaderboardStandingsPayload,
  getAllTimeStandingsPayload
} from '$lib/server/readModels/leaderboardCache';
import { getGroupCachePayload } from '$lib/server/readModels/groupCache';
import { generateSeasonWrapped } from '$lib/server/seasonWrapped';
import { getSeasonWrapped } from '$lib/server/db/queries/seasonWrapped';
import { getRecentRecaps } from '$lib/server/db/queries/recaps';
import { getGamesWithActiveLines } from '$lib/server/db/queries/getGamesWithActiveLines';
import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
import type { DemoSnapshot, DemoLiveGame, DemoGameStatus } from '$lib/types/demo';
import type { TeamSide, WeightCode } from '$lib/types/domain';

// The demo presents its frozen Wrapped prose as finished commentary, never the "AI unavailable"
// fallback note — the prose is a curated demo artifact regardless of how it was produced. This
// mirrors `seed-demo`, which writes deterministic recap prose as `is_fallback: false` for the
// same reason. The honest provenance (real LLM vs deterministic) lives in `meta.aiProse`.
function presentAsFinished(row: SeasonWrappedRow | null): SeasonWrappedRow | null {
  if (!row) return null;
  return { ...row, is_fallback: false, model: row.model ?? 'openai/gpt-5.4' };
}

// The designated demo group (matches the `db:seed:demo` league). The persona defaults to the
// featured season's champion — an aspirational, fictional (non-admin) "you" — resolved from the
// real standings so it self-adjusts to the seed rather than hard-coding a user id.
const DEFAULT_GROUP_ID = '00000000-0000-4000-8000-000000000017'; // "Sunday Bets"

/** Build the frozen live-week picks screen from the currently-active week + the persona's picks. */
async function buildDemoLiveWeek(
  groupId: string,
  personaId: string
): Promise<{ weekNumber: number; games: DemoLiveGame[] }> {
  const now = new Date().toISOString();

  // The active window (start <= now <= end); fall back to the latest started week.
  let { data: week } = await supabaseService
    .from('weeks')
    .select('id, week_number')
    .lte('start_ts', now)
    .gte('end_ts', now)
    .order('start_ts', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!week) {
    const fallback = await supabaseService
      .from('weeks')
      .select('id, week_number')
      .lte('start_ts', now)
      .order('start_ts', { ascending: false })
      .limit(1)
      .maybeSingle();
    week = fallback.data ?? null;
  }
  if (!week) return { weekNumber: 0, games: [] };

  const pickGames = await getGamesWithActiveLines(week.id);
  const gameIds = pickGames.map((g) => g.id);

  const [{ data: gameRows }, { data: pickRows }] = await Promise.all([
    supabaseService.from('games').select('id, status, final_scores').in('id', gameIds),
    supabaseService
      .from('picks')
      .select('game_id, picked_team_id, weight')
      .eq('group_id', groupId)
      .eq('user_id', personaId)
      .in('game_id', gameIds)
  ]);

  const finalById = new Map(
    (gameRows ?? []).map((g) => [
      g.id as string,
      g.final_scores as { home: number; away: number } | null
    ])
  );
  const pickById = new Map((pickRows ?? []).map((p) => [p.game_id as string, p]));

  const nowMs = Date.now();
  const games: DemoLiveGame[] = pickGames.map((g) => {
    const finalScores = finalById.get(g.id) ?? null;
    const kickedOff = new Date(g.kickoff).getTime() <= nowMs;
    const status: DemoGameStatus = finalScores ? 'final' : kickedOff ? 'locked' : 'open';

    const pick = pickById.get(g.id);
    const personaPick =
      pick && pick.picked_team_id != null && pick.weight
        ? {
            side: (pick.picked_team_id === g.homeTeamId ? 'home' : 'away') as TeamSide,
            weight: pick.weight as WeightCode,
            locked: kickedOff
          }
        : null;

    return { ...g, status, personaPick, finalScores };
  });

  return { weekNumber: week.week_number as number, games };
}

async function assembleDemoSnapshot(params: {
  groupId: string;
  personaId: string | null;
  completedSeasonYear: number;
}): Promise<DemoSnapshot> {
  const { groupId, completedSeasonYear } = params;

  const currentSeasonYear = await getCurrentSeasonYear();

  // Regenerate the Wrapped through the real pipeline so the frozen prose is a genuine product
  // artifact (real LLM when this runs where the gateway creds live; deterministic fallback
  // otherwise). Idempotent + completeness-gated inside generateSeasonWrapped.
  await generateSeasonWrapped(groupId, completedSeasonYear, { force: true });

  // Standings drive the persona default: the featured season's champion (rank 1) is the
  // aspirational "you", unless an explicit persona was requested.
  const [leaderboard, allTime, group] = await Promise.all([
    getLeaderboardStandingsPayload(groupId, completedSeasonYear, currentSeasonYear),
    getAllTimeStandingsPayload(groupId),
    getGroupCachePayload(groupId, completedSeasonYear)
  ]);

  const championId = leaderboard.totals.find((t) => t.rank === 1)?.user_id ?? null;
  const personaId = params.personaId ?? championId ?? leaderboard.totals[0]?.user_id;
  if (!personaId)
    throw new Error(`No players found for group ${groupId} season ${completedSeasonYear}`);

  const [wrapped, recaps, liveWeek, personaRow] = await Promise.all([
    getSeasonWrapped(groupId, completedSeasonYear, personaId),
    getRecentRecaps(groupId, completedSeasonYear, 5),
    buildDemoLiveWeek(groupId, personaId),
    supabaseService
      .from('users')
      .select('display_name, avatar_key')
      .eq('id', personaId)
      .maybeSingle()
  ]);

  // Honest provenance from the *original* rows, captured before we present them as finished.
  const aiProse =
    wrapped.league?.is_fallback === false || wrapped.player?.is_fallback === false
      ? 'live'
      : 'fallback';

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      groupId,
      groupName: group.group.name,
      completedSeasonYear,
      liveSeasonYear: currentSeasonYear,
      liveWeekNumber: liveWeek.weekNumber,
      aiProse
    },
    persona: {
      userId: personaId,
      displayName: personaRow.data?.display_name ?? 'You',
      avatarKey: personaRow.data?.avatar_key ?? null
    },
    liveWeek,
    leaderboard,
    allTime,
    honors: { honors: group.honors, badges: group.badges, members: group.members },
    wrapped: {
      player: presentAsFinished(wrapped.player),
      league: presentAsFinished(wrapped.league)
    },
    recaps
  };
}

export const GET: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const { url } = event;
  const groupId = url.searchParams.get('group') ?? DEFAULT_GROUP_ID;
  const personaId = url.searchParams.get('persona');

  const currentSeasonYear = await getCurrentSeasonYear();
  const seasonParam = url.searchParams.get('season');
  // Default the featured completed season to two years back — the oldest fully-graded demo
  // season, whose champion is a fictional (non-admin) persona.
  const completedSeasonYear = seasonParam ? Number(seasonParam) : currentSeasonYear - 2;

  const snapshot = await assembleDemoSnapshot({ groupId, personaId, completedSeasonYear });
  return json(snapshot);
};

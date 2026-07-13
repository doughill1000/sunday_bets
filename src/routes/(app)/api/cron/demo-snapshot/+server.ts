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
// is connected to (locally: the `db:seed:demo` league). The only writes are to the demo group's
// OWN derived commentary rows — `generateSeasonWrapped` (Wrapped) and `regenerateDemoRecaps`
// (weekly recaps), both idempotent force-refreshes through the real voice pipeline — never
// real-user data.
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
import { getRecentRecaps, upsertRecap, type RecapRow } from '$lib/server/db/queries/recaps';
import { buildRecapFacts } from '$lib/server/recap/facts';
import { generateRecapProse } from '$lib/server/recap/voice';
import { getGamesWithActiveLines } from '$lib/server/db/queries/getGamesWithActiveLines';
import {
  assembleWeeklyBreakdown,
  assembleWeeklyLiveStandings,
  type GameInputRow
} from '$lib/utils/weeklyPicks';
import { favoriteSide } from '$lib/domain/spread';
import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
import type { DemoSnapshot, DemoLiveGame, DemoLiveWeek, DemoGameStatus } from '$lib/types/demo';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import type { PickGame } from '$lib/types/games';
import type { GroupMember } from '$lib/types/group';
import type { GroupPickEntry } from '$lib/types/picks';
import type { LiveScoreEntry } from '$lib/live/types';
import type { LeaderboardPlayer } from '$lib/types/leaderboard';

// The demo presents its frozen Wrapped prose as finished commentary, never the "AI unavailable"
// fallback note — the prose is a curated demo artifact regardless of how it was produced. This
// mirrors `seed-demo`, which writes deterministic recap prose as `is_fallback: false` for the
// same reason. The honest provenance (real LLM vs deterministic) lives in `meta.aiProse`.
function presentAsFinished(row: SeasonWrappedRow | null): SeasonWrappedRow | null {
  if (!row) return null;
  return { ...row, is_fallback: false, model: row.model ?? 'openai/gpt-5.4' };
}

/** Same "curated artifact, not an AI-unavailable note" presentation for the weekly recaps. */
function presentRecapAsFinished(row: RecapRow): RecapRow {
  return { ...row, is_fallback: false, model: row.model ?? 'openai/gpt-5.4' };
}

/**
 * Regenerate the demo group's weekly recaps through the REAL LLM voice pipeline
 * (buildRecapFacts → generateRecapProse), overwriting the deterministic seed rows so the demo
 * shows the genuine Commissioner voice, not the flat seed template. Mirrors
 * generateSeasonWrapped's force-refresh: run against a deploy with AI Gateway creds and the
 * frozen recaps become real prose; run locally without creds and they fall back to deterministic
 * copy (surfaced honestly via meta.aiProse). Writes only the demo group's own ai_recaps rows —
 * never real-user data. Regenerates ascending so each week's badge-diff reads the freshly-written
 * prior week.
 */
async function regenerateDemoRecaps(groupId: string, seasonYear: number): Promise<void> {
  // The weeks that already carry a (seeded) recap are exactly the demo weeks to refresh.
  const { data: existing } = await supabaseService
    .from('ai_recaps')
    .select('week_number')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  const weekNumbers = [...new Set((existing ?? []).map((r) => r.week_number as number))];
  if (weekNumbers.length === 0) return;

  // Resolve those week numbers to week ids within the featured season.
  const { data: season } = await supabaseService
    .from('seasons')
    .select('id')
    .eq('year', seasonYear)
    .maybeSingle();
  if (!season) return;

  const { data: weeks } = await supabaseService
    .from('weeks')
    .select('id, week_number')
    .eq('season_id', season.id)
    .in('week_number', weekNumbers)
    .order('week_number', { ascending: true });

  for (const w of weeks ?? []) {
    const facts = await buildRecapFacts({ groupId, weekId: w.id as number });
    const voice = await generateRecapProse(facts);
    await upsertRecap({
      groupId,
      seasonYear,
      weekNumber: w.week_number as number,
      prose: voice.prose,
      facts: facts as Parameters<typeof upsertRecap>[0]['facts'],
      isFallback: voice.is_fallback,
      model: voice.model,
      promptTokens: voice.prompt_tokens,
      completionTokens: voice.completion_tokens
    });
  }
}

// The designated demo group (matches the `db:seed:demo` league). The persona defaults to the
// featured season's champion — an aspirational, fictional (non-admin) "you" — resolved from the
// real standings so it self-adjusts to the seed rather than hard-coding a user id.
const DEFAULT_GROUP_ID = '00000000-0000-4000-8000-000000000017'; // "Sunday Bets"

// --- Frozen mid-game "live" week (#585) --------------------------------------------------------
// The public demo has no ESPN feed, so we author a plausible Sunday over the active week's REAL
// games: each in-play game gets a live score synthesized against its real spread (so the cover
// verdicts are exact) plus authored member picks, and the persona's own card demonstrates all four
// states — covering, not covering, push, and Final — unofficial. Display-only: nothing is graded,
// and the provisional board is assembled through the same `assembleWeeklyLiveStandings` the shipped
// Weekly board (#584) uses, so the demo stays honest.

type LiveRole = {
  status: 'in_progress' | 'final';
  /** Points the FAVORITE is beating the number by (+ covering, − failing, 0 = exactly on it). */
  favCushion: number;
  displayClock: string | null;
  period: number | null;
  /** The underdog's points; the favorite's are derived from the cushion. */
  dogBase: number;
  /** The persona's weight on this game (she always rides the favorite), or null if she skipped it. */
  personaWeight: WeightCode | null;
};

const DEMO_WEIGHT_CYCLE: WeightCode[] = ['L', 'M', 'H'];

/** A game's favorite side from its frozen line, defaulting to home for a pick'em. */
function favoredSide(g: PickGame): TeamSide {
  return favoriteSide(g) ?? 'home';
}

/** Synthesize a box score in which the favorite beats the number by `role.favCushion`. */
function synthesizeScore(g: PickGame, role: LiveRole): { home: number; away: number } {
  const absSpread = Math.abs(g.spreadValue ?? 0);
  const favMargin = Math.round(absSpread + role.favCushion); // favorite pts − underdog pts
  const fav = Math.max(0, role.dogBase + favMargin);
  return favoredSide(g) === 'home'
    ? { home: fav, away: role.dogBase }
    : { home: role.dogBase, away: fav };
}

/** A revealed member pick on the favorite (or underdog) side, shaped for the group-cover dots. */
function toGroupPick(
  g: PickGame,
  member: LeaderboardPlayer,
  onFavorite: boolean,
  weight: WeightCode
): GroupPickEntry {
  const favSide = favoredSide(g);
  const side: TeamSide = onFavorite ? favSide : favSide === 'home' ? 'away' : 'home';
  return {
    userId: member.id,
    displayName: member.display_name,
    avatarKey: member.avatar_key ?? null,
    gameId: g.id,
    pickedSide: side,
    weight,
    pickedTeamShort: side === 'home' ? g.home : g.away,
    pickedTeamId: side === 'home' ? g.homeTeamId : g.awayTeamId,
    lockedSpreadValue: g.spreadValue,
    lockedSpreadTeamId: g.spreadTeamId
  };
}

/** A non-persona member's pick on one game, or null for a deterministic "hasn't picked" gap. */
function memberPickFor(
  gameIdx: number,
  memberIdx: number
): { onFavorite: boolean; weight: WeightCode } | null {
  if ((gameIdx * 5 + memberIdx * 3) % 7 === 0) return null; // a light, deterministic skip
  return {
    onFavorite: (gameIdx + memberIdx) % 3 !== 0, // ~2/3 ride the favorite
    weight: DEMO_WEIGHT_CYCLE[(gameIdx + memberIdx) % DEMO_WEIGHT_CYCLE.length]
  };
}

/**
 * Build the frozen, mid-game "live" week (#585): resolve the active week's real slate, bake a
 * curated Sunday over it (a late OPEN game for the pick affordance, in-progress games, and one
 * Final — unofficial), and pre-assemble the provisional Weekly board through the shipped
 * assembler. The persona always rides the favorite so her card reads covering / not covering /
 * push / final in one glance.
 */
async function buildDemoLiveWeek(personaId: string, members: GroupMember[]): Promise<DemoLiveWeek> {
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
  if (!week) return { weekNumber: 0, games: [], standings: [] };

  const pickGames = await getGamesWithActiveLines(week.id);
  const weekNumber = week.week_number as number;
  if (pickGames.length === 0) return { weekNumber, games: [], standings: [] };

  // Stable, deterministic member + game order so the fixture regenerates byte-identically.
  const players: LeaderboardPlayer[] = [...members]
    .sort((a, b) => a.userId.localeCompare(b.userId))
    .map((m) => ({ id: m.userId, display_name: m.displayName, avatar_key: m.avatarKey }));
  const sorted = [...pickGames].sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  // The latest kickoff stays OPEN (the "still to pick" affordance) as long as we keep four in-play
  // games for the four states; the push must land on an integer-spread game (a half-point line can
  // never sit exactly on the number).
  const isInteger = (g: PickGame) => {
    const s = Math.abs(g.spreadValue ?? 0);
    return s >= 1 && Number.isInteger(s);
  };
  const openGame = sorted.length > 4 ? sorted[sorted.length - 1] : null;
  const inPlay = openGame ? sorted.slice(0, -1) : sorted;
  const pushGame = inPlay.find(isInteger) ?? inPlay[0];
  const finalGame =
    inPlay.find((g) => g !== pushGame && isInteger(g)) ??
    inPlay.find((g) => g !== pushGame) ??
    pushGame;
  const rest = inPlay.filter((g) => g !== pushGame && g !== finalGame);
  const coveringGame = rest[0] ?? null;
  const notCoveringGame = rest[1] ?? null;

  const roleFor = (g: PickGame): LiveRole => {
    if (g === finalGame)
      return { status: 'final', favCushion: 4, displayClock: null, period: null, dogBase: 20, personaWeight: 'A' }; // prettier-ignore
    if (g === pushGame)
      return { status: 'in_progress', favCushion: 0, displayClock: '2:03', period: 4, dogBase: 17, personaWeight: 'L' }; // prettier-ignore
    if (g === coveringGame)
      return { status: 'in_progress', favCushion: 3, displayClock: '5:42', period: 3, dogBase: 19, personaWeight: 'H' }; // prettier-ignore
    if (g === notCoveringGame)
      return { status: 'in_progress', favCushion: -3, displayClock: '9:15', period: 2, dogBase: 19, personaWeight: 'M' }; // prettier-ignore
    return { status: 'in_progress', favCushion: 2, displayClock: '12:20', period: 1, dogBase: 20, personaWeight: 'M' }; // prettier-ignore
  };

  const games: DemoLiveGame[] = sorted.map((g, gameIdx) => {
    if (g === openGame) {
      return {
        ...g,
        status: 'open' as DemoGameStatus,
        personaPick: null,
        liveScore: null,
        groupPicks: []
      };
    }
    const role = roleFor(g);
    const score = synthesizeScore(g, role);
    const liveScore: LiveScoreEntry = {
      homeScore: score.home,
      awayScore: score.away,
      status: role.status,
      displayClock: role.status === 'in_progress' ? role.displayClock : null,
      period: role.status === 'in_progress' ? role.period : null
    };

    const groupPicks: GroupPickEntry[] = [];
    players.forEach((m, memberIdx) => {
      if (m.id === personaId) {
        if (role.personaWeight) groupPicks.push(toGroupPick(g, m, true, role.personaWeight));
        return;
      }
      const mp = memberPickFor(gameIdx, memberIdx);
      if (mp) groupPicks.push(toGroupPick(g, m, mp.onFavorite, mp.weight));
    });

    const personaPick: DemoLiveGame['personaPick'] = role.personaWeight
      ? { side: favoredSide(g), weight: role.personaWeight, locked: true }
      : null;
    const status: DemoGameStatus = role.status === 'final' ? 'final_unofficial' : 'in_progress';
    return { ...g, status, personaPick, liveScore, groupPicks };
  });

  // Provisional Weekly board — assembled through the shipped #584 path (no graded settlements yet).
  const gameInputRows: GameInputRow[] = sorted.map((g) => ({
    id: g.id,
    commence_time: g.kickoff,
    final_scores: null,
    home_team_id: g.homeTeamId,
    away_team_id: g.awayTeamId,
    home: { short_name: g.home },
    away: { short_name: g.away }
  }));
  const allGroupPicks = games.flatMap((dg) => dg.groupPicks);
  const liveScores: Record<string, LiveScoreEntry> = {};
  for (const dg of games) if (dg.liveScore) liveScores[dg.id] = dg.liveScore;
  const breakdown = assembleWeeklyBreakdown(gameInputRows, allGroupPicks, [], players, personaId);
  const standings = assembleWeeklyLiveStandings(breakdown, liveScores);

  return { weekNumber, games, standings };
}

async function assembleDemoSnapshot(params: {
  groupId: string;
  personaId: string | null;
  completedSeasonYear: number;
}): Promise<DemoSnapshot> {
  const { groupId, completedSeasonYear } = params;

  const currentSeasonYear = await getCurrentSeasonYear();

  // Regenerate BOTH the Wrapped and the weekly recaps through the real voice pipeline so the
  // frozen prose is a genuine product artifact (real LLM when this runs where the gateway creds
  // live; deterministic fallback otherwise). Both are force-refreshes that touch only the demo
  // group's own derived rows.
  await Promise.all([
    generateSeasonWrapped(groupId, completedSeasonYear, { force: true }),
    regenerateDemoRecaps(groupId, completedSeasonYear)
  ]);

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
    buildDemoLiveWeek(personaId, group.members),
    supabaseService
      .from('users')
      .select('display_name, avatar_key')
      .eq('id', personaId)
      .maybeSingle()
  ]);

  // Honest provenance from the *original* rows, captured before we present them as finished.
  // 'live' only when everything the demo shows is real LLM prose — so `pnpm demo:snapshot` warns
  // (and Doug re-runs against a creds-bearing deploy) if either the Wrapped or any recap fell back.
  const wrappedLive =
    wrapped.league?.is_fallback === false || wrapped.player?.is_fallback === false;
  const recapsLive = recaps.length > 0 && recaps.every((r) => r.is_fallback === false);
  const aiProse = wrappedLive && recapsLive ? 'live' : 'fallback';

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
    recaps: recaps.map(presentRecapAsFinished)
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

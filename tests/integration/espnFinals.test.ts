import { describe, test, expect, vi, afterEach, beforeAll } from 'vitest';
import { createSupaClient } from './_helpers';
import { ensureTeams, ensureSettings, ensureSeasonAndWeek, clearWeekGames } from './fixtures/db';

// grading.ts imports @sentry/sveltekit, whose ESM entry pulls in a client build that
// references the `$app` virtual module (unavailable in this node/jsdom test env). Mock
// it — the same posture the grading unit tests use — so the module imports cleanly.
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

import { gradeGame } from '$lib/server/grading';

// End-to-end coverage for ESPN-as-primary score source (issue #450, ADR-0025):
// the real PostgREST embed (week -> season year) that drives ESPN scoreboard
// coordinates, the matchup-identity match, the per-game Odds fallback, and the
// no-daysFrom-window backfill path — all against the live local Supabase.

const supabase = createSupaClient();
const SEASON_YEAR = 2097; // live (>= 2025) so grade_game is not a locked no-op

let chiefsId: number;
let billsId: number;

// Intercept only the external providers; the Supabase client's own fetches pass through.
function mockExternalFetch(handlers: { espn?: unknown; oddsScores?: unknown }) {
  const originalFetch = globalThis.fetch;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('site.api.espn.com') && handlers.espn !== undefined) {
      return new Response(JSON.stringify(handlers.espn), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (url.includes('api.the-odds-api.com') && handlers.oddsScores !== undefined) {
      return new Response(JSON.stringify(handlers.oddsScores), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-requests-last': '1' }
      });
    }
    return originalFetch(input, init);
  });
}

// An ESPN scoreboard payload for the KC (home) vs BUF (away) matchup. `season` is
// omitted so the season-mismatch guard is a no-op for the mocked year.
function espnScoreboard(opts: { completed: boolean; home?: number; away?: number }) {
  return {
    week: { number: 1 },
    events: [
      {
        id: 'espn-finals-evt-1',
        date: new Date().toISOString(),
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                score: opts.home != null ? String(opts.home) : undefined,
                team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs' }
              },
              {
                homeAway: 'away',
                score: opts.away != null ? String(opts.away) : undefined,
                team: { abbreviation: 'BUF', displayName: 'Buffalo Bills' }
              }
            ],
            status: {
              type: { state: opts.completed ? 'post' : 'pre', completed: opts.completed }
            }
          }
        ]
      }
    ]
  };
}

async function insertGame(
  weekId: number,
  externalId: string,
  commenceTime: string
): Promise<string> {
  await clearWeekGames(supabase, weekId); // matchup uniqueness: drop any prior game for this week
  const { data, error } = await supabase
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: chiefsId,
      away_team_id: billsId,
      commence_time: commenceTime,
      external_game_id: externalId,
      status: 'scheduled'
    })
    .select('id')
    .single();
  if (error) throw new Error(`insertGame failed: ${error.message}`);
  return data.id as string;
}

async function finalScoresOf(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('final_scores')
    .eq('id', gameId)
    .single();
  if (error) throw new Error(error.message);
  return data.final_scores as { home: number; away: number } | null;
}

describe('ESPN finals as primary score source (issue #450, ADR-0025)', () => {
  beforeAll(async () => {
    // ensureTeams seeds teams.external_key (= 'KC'/'BUF'), which the ESPN-finals path
    // matches on via findTeamsByExternalKeys — no manual backfill needed here.
    await ensureTeams(supabase);
    await ensureSettings(supabase);

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('name', ['Kansas City Chiefs', 'Buffalo Bills']);
    chiefsId = teams!.find((t) => t.name === 'Kansas City Chiefs')!.id;
    billsId = teams!.find((t) => t.name === 'Buffalo Bills')!.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('populates final_scores from the ESPN scoreboard by matchup identity', async () => {
    const { weekId } = await ensureSeasonAndWeek(supabase, SEASON_YEAR, 1);
    const gameId = await insertGame(weekId, 'espn-primary-1', new Date().toISOString());

    mockExternalFetch({ espn: espnScoreboard({ completed: true, home: 27, away: 20 }) });
    await gradeGame(gameId, { refreshScores: true, daysFrom: 3 });

    expect(await finalScoresOf(gameId)).toEqual({ home: 27, away: 20 });

    // The raw ESPN payload is retained for audit (extends #382).
    const { data: retained } = await supabase
      .from('espn_api_responses')
      .select('endpoint, http_status')
      .eq('endpoint', 'scoreboard')
      .order('fetched_at', { ascending: false })
      .limit(1);
    expect(retained).toHaveLength(1);
    expect(retained![0].http_status).toBe(200);
  });

  test('falls back to Odds /scores for a game ESPN has not completed', async () => {
    const { weekId } = await ensureSeasonAndWeek(supabase, SEASON_YEAR, 2);
    const externalId = 'espn-fallback-1';
    const gameId = await insertGame(weekId, externalId, new Date().toISOString());

    mockExternalFetch({
      // ESPN shows the game as not yet completed → miss → per-game Odds fallback.
      espn: espnScoreboard({ completed: false }),
      oddsScores: [
        {
          id: externalId,
          completed: true,
          scores: [
            { name: 'Kansas City Chiefs', score: 14 },
            { name: 'Buffalo Bills', score: 10 }
          ],
          commence_time: new Date().toISOString()
        }
      ]
    });
    await gradeGame(gameId, { refreshScores: true, daysFrom: 3 });

    expect(await finalScoresOf(gameId)).toEqual({ home: 14, away: 10 });
  });

  test('grades a >3-day-old game from ESPN with no daysFrom window', async () => {
    const { weekId } = await ensureSeasonAndWeek(supabase, SEASON_YEAR, 3);
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const gameId = await insertGame(weekId, 'espn-backfill-1', fortyDaysAgo);

    // Only ESPN is mocked. daysFrom=1 would exclude a 40-day-old game from the Odds
    // window; ESPN has no window, so the final still lands (and Odds is never called —
    // an un-mocked the-odds-api request would otherwise hit the network).
    mockExternalFetch({ espn: espnScoreboard({ completed: true, home: 31, away: 3 }) });
    await gradeGame(gameId, { refreshScores: true, daysFrom: 1 });

    expect(await finalScoresOf(gameId)).toEqual({ home: 31, away: 3 });
  });
});

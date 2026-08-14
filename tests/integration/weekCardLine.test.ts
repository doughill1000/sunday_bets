// tests/integration/weekCardLine.test.ts
//
// #836: the /week scorecards show the game's line, so a reader can tell what the pick was
// against. The selection rule (closing beats active; no line renders nothing) is proven as pure
// logic in src/lib/utils/__tests__/weeklyPicks.test.ts. What that suite cannot prove is the half
// that only exists as a PostgREST string: the `game_lines` embed in
// `getGamesForWeeksWithScores`.
//
// Two ways that embed can be wrong, both silent under type-checking and both regressions users
// would see:
//
//   * `game_lines!inner` (the form `listGamesWithActiveLine` legitimately uses) would drop every
//     unlined game out of the week entirely. An unlined game was never pickable (#802/#803) but
//     it still has to render its card — the acceptance criteria call the zero-state out by name.
//   * the nested `or=(is_closing_line,is_active_line)` filter constrains the EMBEDDED rows only.
//     `game_lines` is append-only, so without it a settled week drags back every historical
//     snapshot per game; with it applied to the wrong level it would filter the games instead.
//
// So this suite seeds a week holding all three shapes at once — a settled game carrying a
// closing line plus a superseded active row, a live game with only an active line, and a game
// with no line at all — and asserts what comes back over the wire.
//
// Owns NFL season year 2071 (other suites hold 2009/2024/2041/2044/2051/2062/2063/2073/2077/
// 2087/2093/2095-2099). No users, groups or picks: the line rides on the game, not the pick.

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import { ensureTeams } from './fixtures/db';
import { getGamesForWeeksWithScores } from '../../src/lib/server/db/queries/getGamesForWeeksWithScores';
import { assembleWeeklyBreakdown } from '../../src/lib/utils/weeklyPicks';
import type { GameInputRow } from '../../src/lib/utils/weeklyPicks';

const admin = createServiceClient();

const SEASON_YEAR = 2071;
const SETTLED_ID = 'wcl-2071-settled';
const LIVE_ID = 'wcl-2071-live';
const UNLINED_ID = 'wcl-2071-unlined';

let seasonId: number;
let weekId: number;
const teamId: Record<string, number> = {};
const gameIdByExternal: Record<string, string> = {};

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`weekCardLine: could not resolve season ${year}`);
  return existing.id as number;
}

async function insertGame(
  externalId: string,
  home: string,
  away: string,
  finalScores: { home: number; away: number } | null,
  commenceTime: string
): Promise<string> {
  await admin.from('games').delete().eq('external_game_id', externalId);
  const { data, error } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: teamId[home],
      away_team_id: teamId[away],
      external_game_id: externalId,
      status: finalScores ? 'final' : 'in_progress',
      commence_time: commenceTime,
      final_scores: finalScores
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`weekCardLine: insert ${externalId}: ${error?.message}`);
  gameIdByExternal[externalId] = data.id as string;
  return data.id as string;
}

async function insertLine(
  gameId: string,
  spreadTeam: string,
  spreadValue: number,
  flags: { active?: boolean; closing?: boolean; fetchedAt?: string } = {}
) {
  const { error } = await admin.from('game_lines').insert({
    game_id: gameId,
    source: 'fanduel',
    spread_team_id: teamId[spreadTeam],
    spread_value: spreadValue,
    is_active_line: flags.active ?? false,
    is_closing_line: flags.closing ?? false,
    ...(flags.fetchedAt ? { fetched_at: flags.fetchedAt } : {})
  });
  if (error) throw new Error(`weekCardLine: insert line for ${gameId}: ${error.message}`);
}

/** The /week card's view of a game, exactly as the load path assembles it. */
async function cardsByExternalId() {
  const result = await getGamesForWeeksWithScores([weekId]);
  if (result.error) throw result.error;
  const breakdown = assembleWeeklyBreakdown(
    (result.data ?? []) as unknown as GameInputRow[],
    [],
    [],
    [],
    null
  );
  const byExternal: Record<string, (typeof breakdown)[number]> = {};
  for (const [externalId, gameId] of Object.entries(gameIdByExternal)) {
    const card = breakdown.find((g) => g.gameId === gameId);
    if (card) byExternal[externalId] = card;
  }
  return { breakdown, byExternal };
}

beforeAll(async () => {
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF', 'PHI', 'DAL']);
  if (!teams || teams.length < 4) throw new Error('weekCardLine: need KC/BUF/PHI/DAL teams');
  for (const t of teams) teamId[t.short_name as string] = t.id as number;

  seasonId = await upsertSeason(SEASON_YEAR);

  const { data: week, error: wErr } = await admin
    .from('weeks')
    .upsert(
      {
        season_id: seasonId,
        week_number: 3,
        start_ts: '2071-09-22T04:00:00Z',
        end_ts: '2071-09-29T04:00:00Z',
        is_scoring: true
      },
      { onConflict: 'season_id,week_number' }
    )
    .select('id')
    .single();
  if (wErr || !week) throw new Error(`weekCardLine: upsert week: ${wErr?.message}`);
  weekId = week.id as number;

  // A settled game: capture flagged the last pre-kickoff line at first grade (#735), and an
  // earlier snapshot survives alongside it as a plain superseded row. BUF (away) is the
  // favorite — the #734 inversion shape, which a sign-based reader would print as KC.
  const settled = await insertGame(
    SETTLED_ID,
    'KC',
    'BUF',
    { home: 17, away: 20 },
    '2071-09-26T17:00:00Z'
  );
  await insertLine(settled, 'BUF', 2.5, { fetchedAt: '2071-09-20T12:00:00Z' });
  await insertLine(settled, 'BUF', 3.5, { closing: true, fetchedAt: '2071-09-26T16:55:00Z' });

  // A game still in play: no closing line yet, only the live active pointer.
  const live = await insertGame(LIVE_ID, 'PHI', 'DAL', null, '2071-09-26T20:25:00Z');
  await insertLine(live, 'PHI', 0, { active: true, fetchedAt: '2071-09-26T20:20:00Z' });

  // A game the book never posted — never pickable, and the card must still exist.
  await insertGame(UNLINED_ID, 'DAL', 'KC', null, '2071-09-26T20:25:00Z');
});

afterAll(async () => {
  await admin.from('games').delete().in('external_game_id', [SETTLED_ID, LIVE_ID, UNLINED_ID]);
  if (weekId) await admin.from('weeks').delete().eq('id', weekId);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
});

describe("the /week card carries the game's line (#836)", () => {
  test('the embed is not an inner join — an unlined game still gets a card', async () => {
    const { breakdown, byExternal } = await cardsByExternalId();

    expect(breakdown).toHaveLength(3);
    expect(byExternal[UNLINED_ID]).toBeDefined();
    expect(byExternal[UNLINED_ID].spreadTeamId).toBeNull();
    expect(byExternal[UNLINED_ID].spreadValue).toBeNull();
  });

  test('a settled game reads its closing line, not the superseded snapshot', async () => {
    const { byExternal } = await cardsByExternalId();
    const card = byExternal[SETTLED_ID];

    expect(card.spreadValue).toBe(3.5);
    // The favorite is the AWAY team here: the assembler passes spread_team_id through so the
    // renderer derives fav/dog from team identity rather than the sign (#734).
    expect(card.spreadTeamId).toBe(teamId.BUF);
    expect(card.awayTeamId).toBe(teamId.BUF);
  });

  test('a game still in play falls back to the active line, and a pick’em stays 0', async () => {
    const { byExternal } = await cardsByExternalId();
    const card = byExternal[LIVE_ID];

    expect(card.spreadValue).toBe(0);
    expect(card.spreadTeamId).toBe(teamId.PHI);
    // 0 is a real line (#802), so it must not collapse into the no-line branch.
    expect(card.spreadValue).not.toBeNull();
  });

  test('the nested filter trims the embed to the usable rows, not the whole history', async () => {
    // The settled game holds two rows in the table but only one is closing/active, so only one
    // may come back — the guard against a settled week dragging every snapshot over the wire.
    const result = await getGamesForWeeksWithScores([weekId]);
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as unknown as GameInputRow[];

    const settled = rows.find((g) => g.id === gameIdByExternal[SETTLED_ID]);
    expect(settled?.game_lines).toHaveLength(1);
    expect(rows.find((g) => g.id === gameIdByExternal[UNLINED_ID])?.game_lines).toEqual([]);

    const { count } = await admin
      .from('game_lines')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameIdByExternal[SETTLED_ID]);
    expect(count).toBe(2);
  });
});

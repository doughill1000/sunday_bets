// tests/integration/nonScoringWeek.test.ts
//
// Verifies non-scoring rounds (ADR-0016) through the TypeScript read paths.
//
// A non-scoring week (here a negative preseason week with is_scoring=false) is still
// graded — settlements exist and are viewable — but contributes ZERO to the leaderboard
// and stats. This suite owns season year 2009 (a past year so weeks are start_ts-eligible
// for getSeasonWeekOptions, and distinct from the other suites: 2098/2099/2097/2024/2041).
//
// It also owns the #789 regression for the surface that actually wrote a prod row: the AI
// recap generator. The fun week here is deliberately fully graded (final_scores on its game)
// and has a real pick, so the completeness gate and the group-discovery lane both pass — the
// only thing that can stop a recap is the is_scoring gate itself.
//
// The two recap *pushes* are unit-tested instead (notifications.spec.ts): notifications.ts
// imports @sentry/sveltekit and web-push, and the Sentry client entry cannot resolve `$app`
// under this runner. That constraint is why isWeekFullyGraded lives in db/queries rather
// than in notifications.ts, where it started.

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from './_auth';
import {
  ensureAuthUsers,
  deleteAuthUsers,
  ensureTeams,
  ensureGroup,
  ensureMembership
} from './fixtures/db';
import {
  getSeasonLeaderboard,
  getWeeklyCumulative
} from '../../src/lib/server/db/queries/leaderboard';
import { getSeasonWeekOptions } from '../../src/lib/server/weeklyPicks';
import { sendAIRecaps } from '../../src/lib/server/aiRecap';
import { sendSeasonWrappeds } from '../../src/lib/server/seasonWrapped';
import { sendBadgeFlavors } from '../../src/lib/server/badgeFlavor';

const admin = createServiceClient();

const NS_SEASON_YEAR = 2009;
const NS_GROUP_ID = '00000000-0000-4000-8000-000000002009';
const ALICE_ID = '00000000-0000-0000-0000-000000002009';
const BOB_ID = '00000000-0000-0000-0000-000000002008';

let seasonId: number;
let scoringWeekId: number;
let funWeekId: number;
let scoringGameId: string;
let funGameId: string;

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`nonScoringWeek: could not resolve season ${year}`);
  return existing.id as number;
}

async function upsertWeek(
  sid: number,
  weekNumber: number,
  startTs: string,
  endTs: string,
  isScoring: boolean
): Promise<number> {
  const { data: ins } = await admin
    .from('weeks')
    .insert({
      season_id: sid,
      week_number: weekNumber,
      start_ts: startTs,
      end_ts: endTs,
      is_scoring: isScoring
    })
    .select('id')
    .single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('weeks')
    .select('id')
    .eq('season_id', sid)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (error || !existing) throw new Error(`nonScoringWeek: could not resolve week ${weekNumber}`);
  return existing.id as number;
}

async function insertGame(
  weekId: number,
  homeId: number,
  awayId: number,
  externalId: string,
  commenceTs: string
): Promise<string> {
  await admin.from('games').delete().eq('external_game_id', externalId);
  const { data, error } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeId,
      away_team_id: awayId,
      external_game_id: externalId,
      status: 'final',
      // final_scores present so isWeekFullyGraded() reports both weeks complete — the #789
      // tests below need the completeness gate to PASS so the scoring gate is what's proven.
      final_scores: { home: 24, away: 17 },
      commence_time: commenceTs
    })
    .select('id')
    .single();
  if (error || !data)
    throw new Error(`nonScoringWeek: insert game ${externalId}: ${error?.message}`);
  return data.id as string;
}

// A real pick on the non-scoring game: sendAIRecaps discovers candidate groups through
// `picks`, so without one the recap would no-op for the wrong reason and the regression
// test would pass vacuously.
async function insertPick(userId: string, gameId: string, teamId: number, oppTeamId: number) {
  const { error } = await admin.from('picks').upsert(
    {
      group_id: NS_GROUP_ID,
      user_id: userId,
      game_id: gameId,
      picked_team_id: teamId,
      locked_spread_team_id: oppTeamId,
      locked_spread_value: 3.5,
      weight: 'M',
      locked_by: userId,
      locked_at: new Date().toISOString()
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`nonScoringWeek: insert pick: ${error.message}`);
}

async function insertSettlement(
  userId: string,
  gameId: string,
  pointsDelta: number,
  outcome: 'win' | 'loss'
) {
  const { error } = await admin.from('pick_settlement').upsert(
    {
      group_id: NS_GROUP_ID,
      user_id: userId,
      game_id: gameId,
      pick_id: null,
      points_delta: pointsDelta,
      outcome,
      graded_at: new Date().toISOString()
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`nonScoringWeek: insert settlement: ${error.message}`);
}

beforeAll(async () => {
  await ensureAuthUsers([
    { id: ALICE_ID, email: 'ns-alice-2009@example.com', displayName: 'NSAlice2009' },
    { id: BOB_ID, email: 'ns-bob-2009@example.com', displayName: 'NSBob2009' }
  ]);

  const now = new Date().toISOString();
  const { error: userErr } = await admin.from('users').upsert(
    [
      { id: ALICE_ID, display_name: 'NSAlice2009', role: 'player', created_at: now },
      { id: BOB_ID, display_name: 'NSBob2009', role: 'player', created_at: now }
    ],
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('nonScoringWeek: upsert users: ' + userErr.message);

  await ensureGroup(admin, { id: NS_GROUP_ID, name: 'Non-Scoring Group 2009' });
  await ensureMembership(admin, NS_GROUP_ID, [ALICE_ID, BOB_ID]);

  seasonId = await upsertSeason(NS_SEASON_YEAR);
  // Preseason (non-scoring) sorts before the regular week by start_ts.
  funWeekId = await upsertWeek(seasonId, -1, '2009-08-07T00:00:00Z', '2009-08-14T00:00:00Z', false);
  scoringWeekId = await upsertWeek(
    seasonId,
    1,
    '2009-09-04T00:00:00Z',
    '2009-09-11T00:00:00Z',
    true
  );

  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('nonScoringWeek: need KC + BUF teams');
  const homeId = teams.find((t) => t.short_name === 'KC')!.id as number;
  const awayId = teams.find((t) => t.short_name === 'BUF')!.id as number;

  scoringGameId = await insertGame(
    scoringWeekId,
    homeId,
    awayId,
    'ns-2009-score',
    '2009-09-07T18:00:00Z'
  );
  funGameId = await insertGame(funWeekId, homeId, awayId, 'ns-2009-fun', '2009-08-10T18:00:00Z');

  await insertPick(ALICE_ID, funGameId, homeId, awayId);

  // Scoring week counts; non-scoring (bigger magnitudes) must not leak in.
  await insertSettlement(ALICE_ID, scoringGameId, 8, 'win');
  await insertSettlement(BOB_ID, scoringGameId, -3, 'loss');
  await insertSettlement(ALICE_ID, funGameId, 6, 'win');
  await insertSettlement(BOB_ID, funGameId, -10, 'loss');

  const { error: refreshErr } = await admin.rpc('refresh_leaderboard_stats');
  if (refreshErr)
    throw new Error(`nonScoringWeek: refresh_leaderboard_stats: ${refreshErr.message}`);
});

afterAll(async () => {
  await admin
    .from('ai_recaps')
    .delete()
    .eq('group_id', NS_GROUP_ID)
    .eq('season_year', NS_SEASON_YEAR);
  await admin.from('notification_log').delete().in('week_id', [scoringWeekId, funWeekId]);
  await admin.from('pick_settlement').delete().in('game_id', [scoringGameId, funGameId]);
  await admin.from('picks').delete().in('game_id', [scoringGameId, funGameId]);
  await admin.from('games').delete().in('id', [scoringGameId, funGameId]);
  await admin.from('weeks').delete().in('id', [scoringWeekId, funWeekId]);
  await admin.from('seasons').delete().eq('year', NS_SEASON_YEAR);
  await admin
    .from('group_memberships')
    .delete()
    .eq('group_id', NS_GROUP_ID)
    .in('user_id', [ALICE_ID, BOB_ID]);
  await admin.from('users').delete().in('id', [ALICE_ID, BOB_ID]);
  await deleteAuthUsers([ALICE_ID, BOB_ID]);
});

describe('non-scoring rounds (ADR-0016)', () => {
  test('season leaderboard counts only the scoring week', async () => {
    const entries = await getSeasonLeaderboard(NS_SEASON_YEAR, NS_GROUP_ID);
    const alice = entries.find((e) => e.user_id === ALICE_ID);
    const bob = entries.find((e) => e.user_id === BOB_ID);
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    // Scoring only: alice +8 (not 8+6=14), bob -3 (not -3-10=-13). One decision each.
    expect(alice!.total_points).toBe(8);
    expect(alice!.decisions).toBe(1);
    expect(alice!.wins).toBe(1);
    expect(bob!.total_points).toBe(-3);
    expect(bob!.decisions).toBe(1);
    expect(bob!.losses).toBe(1);
  });

  test('weekly trend has no row for the non-scoring week', async () => {
    const trend = await getWeeklyCumulative(NS_SEASON_YEAR, NS_GROUP_ID);
    expect(trend.some((t) => t.week_number === -1)).toBe(false);
    const aliceScoring = trend.find((t) => t.user_id === ALICE_ID && t.week_number === 1);
    expect(aliceScoring).toBeDefined();
    expect(aliceScoring!.week_points).toBe(8);
    expect(aliceScoring!.cumulative_points).toBe(8);
  });

  test('the non-scoring round is still graded — its settlements are retained and viewable', async () => {
    const { data, error } = await admin
      .from('pick_settlement')
      .select('user_id, outcome, points_delta')
      .eq('game_id', funGameId)
      .eq('group_id', NS_GROUP_ID);
    expect(error).toBeNull();
    // Both players' results exist (shown in the weekly breakdown), they just don't count.
    expect(data).toHaveLength(2);
  });

  test('getSeasonWeekOptions surfaces the non-scoring week, labelled and ordered first', async () => {
    const options = await getSeasonWeekOptions(NS_SEASON_YEAR);
    const fun = options.find((w) => w.weekNumber === -1);
    const scoring = options.find((w) => w.weekNumber === 1);
    expect(fun).toBeDefined();
    expect(fun!.isScoring).toBe(false);
    expect(scoring).toBeDefined();
    expect(scoring!.isScoring).toBe(true);
    // Ordered by start_ts: preseason (-1) precedes regular week 1.
    expect(options.findIndex((w) => w.weekNumber === -1)).toBeLessThan(
      options.findIndex((w) => w.weekNumber === 1)
    );
  });
});

// #789: prod generated a real ai_recaps row for 2026 preseason round 1 the moment its one
// game (the Hall of Fame game) went final. Every gate the recap path had — "all games have
// final scores" — was satisfied; none of them asked whether the round counted.
describe('non-scoring rounds tell no story (#789)', () => {
  async function recapRows() {
    const { data, error } = await admin
      .from('ai_recaps')
      .select('week_number')
      .eq('group_id', NS_GROUP_ID)
      .eq('season_year', NS_SEASON_YEAR);
    if (error) throw error;
    return data ?? [];
  }

  test('sendAIRecaps writes no recap for a fully-graded non-scoring week', async () => {
    await admin
      .from('ai_recaps')
      .delete()
      .eq('group_id', NS_GROUP_ID)
      .eq('season_year', NS_SEASON_YEAR);

    const summary = await sendAIRecaps(funWeekId);

    expect(summary).toEqual({ evaluated: 0, generated: 0, fallback: 0, skipped: 0 });
    expect(await recapRows()).toHaveLength(0);
  });

  test('the recap stays absent on a re-run, so the grade cron cannot heal into one', async () => {
    // The cron calls sendAIRecaps on every tick for whichever weeks are "recent"; a preseason
    // week stays recent for days.
    await sendAIRecaps(funWeekId);
    await sendAIRecaps(funWeekId);

    expect(await recapRows()).toHaveLength(0);
  });

  test('the season-end fan-out was already safe — a non-scoring week is never the final week', async () => {
    // loadWeekMeta anchors isFinalWeek on the max is_scoring week, so these two need no
    // gate of their own. Asserted here so that invariant fails loudly if it ever changes.
    expect(await sendSeasonWrappeds(funWeekId)).toMatchObject({ evaluated: 0, generated: 0 });
    expect(await sendBadgeFlavors(funWeekId)).toMatchObject({ evaluated: 0, generated: 0 });
  });
});

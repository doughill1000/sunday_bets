// tests/integration/playerRatings.test.ts
//
// Exercises the credibility rating read model (issue #361, ADR-0032 v2) end-to-end against local
// Supabase: seed real settled picks, run the rebuild, and read public.player_ratings back — the
// DB round-trip the pure fold's unit tests can't cover (view filtering → fold → upsert → read).
//
// The RATING MATH is unit-tested in src/lib/server/rating; here we assert the persisted contract:
// a player over the qualification gate gets a real number, one under it stays Unrated with a
// decisions-to-go count, and a rebuild is idempotent. This suite owns season year 2087.

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { createServiceClient } from './_auth';
import { ensureAuthUsers, deleteAuthUsers, ensureGroup, ensureMembership } from './fixtures/db';
import { rebuildPlayerRatings } from '../../src/lib/server/rating/rebuild';
import { MIN_QUALIFIED_DECISIONS, RATING_PAR } from '../../src/lib/domain/rating';
import type { TablesInsert } from '../../src/lib/types/supabase';

const admin = createServiceClient();
const LOCAL_DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const PR_SEASON_YEAR = 2087;
const PR_GROUP_ID = '00000000-0000-4000-8000-000000002087';
const OTHER_GROUP_ID = '00000000-0000-4000-8000-000000002088';
const ALICE_ID = '00000000-0000-0000-0000-000000002087';
const BOB_ID = '00000000-0000-0000-0000-000000002086';

const TEAM_KEYS = Array.from({ length: 10 }, (_, i) => `PR2_T${i}`);
// Five matchups from the ten teams: (0,1), (2,3), … (8,9).
const MATCHUPS = Array.from({ length: 5 }, (_, i) => [i * 2, i * 2 + 1] as const);

let seasonId: number;
let teamIds: number[] = [];
const weekIds: number[] = [];
const gameIds: string[] = [];

// Alice picks all 25 games (5 weeks × 5 matchups) → over the gate. Bob picks 6 → Unrated.
// Alice's outcomes are cover-heavy so her rating lands clearly above par.
const ALICE_GAMES = 25;
const BOB_GAMES = 6;

function outcomeFor(index: number): 'win' | 'loss' | 'push' {
  // 16 wins / 6 losses / 3 pushes across 25 → ~73% cover, comfortably above 1500.
  if (index % 8 === 3) return 'push';
  if (index % 4 === 2) return 'loss';
  return 'win';
}

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`playerRatings: could not resolve season ${year}`);
  return existing.id as number;
}

beforeAll(async () => {
  await ensureAuthUsers([
    { id: ALICE_ID, email: 'pr-alice-2087@example.com', displayName: 'PRAlice2087' },
    { id: BOB_ID, email: 'pr-bob-2087@example.com', displayName: 'PRBob2087' }
  ]);
  const now = new Date().toISOString();
  const { error: userErr } = await admin.from('users').upsert(
    [
      { id: ALICE_ID, display_name: 'PRAlice2087', role: 'player', created_at: now },
      { id: BOB_ID, display_name: 'PRBob2087', role: 'player', created_at: now }
    ],
    { onConflict: 'id' }
  );
  if (userErr) throw new Error('playerRatings: upsert users: ' + userErr.message);

  await ensureGroup(admin, { id: PR_GROUP_ID, name: 'Rating Group 2087' });
  await ensureGroup(admin, { id: OTHER_GROUP_ID, name: 'Rating Group 2087 (other)' });
  await ensureMembership(admin, PR_GROUP_ID, [ALICE_ID, BOB_ID]);

  seasonId = await upsertSeason(PR_SEASON_YEAR);

  // Ten teams for five distinct matchups per week.
  const { error: teamErr } = await admin.from('teams').upsert(
    TEAM_KEYS.map((key) => ({ name: `PR Rating ${key}`, short_name: key, external_key: key })),
    { onConflict: 'name' }
  );
  if (teamErr) throw new Error('playerRatings: upsert teams: ' + teamErr.message);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', TEAM_KEYS);
  teamIds = TEAM_KEYS.map((k) => teams!.find((t) => t.short_name === k)!.id as number);

  // Five scoring weeks.
  for (let w = 1; w <= 5; w++) {
    const { data: week, error } = await admin
      .from('weeks')
      .insert({
        season_id: seasonId,
        week_number: w,
        start_ts: `2087-09-${String(w).padStart(2, '0')}T00:00:00Z`,
        end_ts: `2087-09-${String(w + 1).padStart(2, '0')}T00:00:00Z`,
        is_scoring: true
      })
      .select('id')
      .single();
    if (error || !week) throw new Error(`playerRatings: insert week ${w}: ${error?.message}`);
    weekIds.push(week.id as number);
  }

  // 25 games (5 weeks × 5 matchups), each a distinct matchup within its week.
  const gameRows = weekIds.flatMap((weekId, wIdx) =>
    MATCHUPS.map(([h, a], mIdx) => ({
      week_id: weekId,
      home_team_id: teamIds[h],
      away_team_id: teamIds[a],
      external_game_id: `pr-2087-w${wIdx}-m${mIdx}`,
      status: 'final',
      commence_time: `2087-09-${String(wIdx + 1).padStart(2, '0')}T${String(mIdx + 12).padStart(2, '0')}:00:00Z`,
      final_scores: { home: 24, away: 20 }
    }))
  );
  const { data: games, error: gameErr } = await admin
    .from('games')
    .insert(gameRows)
    .select('id, external_game_id');
  if (gameErr || !games) throw new Error('playerRatings: insert games: ' + gameErr?.message);
  // Keep games in the deterministic (week, matchup) order the rows were built in.
  for (const row of gameRows) {
    gameIds.push(games.find((g) => g.external_game_id === row.external_game_id)!.id as string);
  }

  // Build picks (explicit ids so the settlement can link pick_id without a round-trip) + settlements.
  const pickRows: TablesInsert<'picks'>[] = [];
  const settlementRows: TablesInsert<'pick_settlement'>[] = [];
  const addPick = (
    userId: string,
    gameIdx: number,
    outcome: 'win' | 'loss' | 'push',
    weight: 'L' | 'M' | 'H' | 'A'
  ) => {
    const pickId = randomUUID();
    const gameId = gameIds[gameIdx];
    const homeTeam = gameRows[gameIdx].home_team_id;
    pickRows.push({
      id: pickId,
      group_id: PR_GROUP_ID,
      user_id: userId,
      game_id: gameId,
      picked_team_id: homeTeam,
      weight,
      locked_at: now,
      locked_spread_team_id: homeTeam,
      locked_spread_value: 3.5,
      locked_by: userId
    });
    settlementRows.push({
      group_id: PR_GROUP_ID,
      user_id: userId,
      game_id: gameId,
      pick_id: pickId,
      points_delta: outcome === 'win' ? 3 : outcome === 'loss' ? -3 : 0,
      outcome,
      graded_at: now
    });
  };

  // Alice: all 25 games. Weight is varied (A/H/M) across her picks — this predates the v2 rewrite
  // (ADR-0032 v2 ignores conviction entirely) and is left as harmless variation in the fixture
  // rather than rewritten to uniform weights.
  for (let i = 0; i < ALICE_GAMES; i++) {
    const outcome = outcomeFor(i);
    const weight = i % 5 === 0 ? 'A' : i % 3 === 0 ? 'H' : 'M';
    addPick(ALICE_ID, i, outcome, weight);
  }
  // Bob: only 6 games → under the qualification gate.
  for (let i = 0; i < BOB_GAMES; i++) {
    addPick(BOB_ID, i, i % 2 === 0 ? 'win' : 'loss', 'M');
  }

  const { error: pickErr } = await admin.from('picks').insert(pickRows);
  if (pickErr) throw new Error('playerRatings: insert picks: ' + pickErr.message);
  const { error: setErr } = await admin.from('pick_settlement').insert(settlementRows);
  if (setErr) throw new Error('playerRatings: insert settlements: ' + setErr.message);

  await rebuildPlayerRatings(admin);
});

afterAll(async () => {
  await admin.from('pick_settlement').delete().in('game_id', gameIds);
  await admin.from('picks').delete().in('game_id', gameIds);
  await admin.from('player_ratings').delete().eq('group_id', PR_GROUP_ID);
  await admin.from('games').delete().in('id', gameIds);
  await admin.from('weeks').delete().in('id', weekIds);
  await admin.from('seasons').delete().eq('year', PR_SEASON_YEAR);
  await admin
    .from('group_memberships')
    .delete()
    .eq('group_id', PR_GROUP_ID)
    .in('user_id', [ALICE_ID, BOB_ID]);
  await admin.from('users').delete().in('id', [ALICE_ID, BOB_ID]);
  await deleteAuthUsers([ALICE_ID, BOB_ID]);
});

describe('player_ratings read model (#361, ADR-0032 v2)', () => {
  test('a player over the gate gets a real rating above par; season delta is null (single season)', async () => {
    const { data, error } = await admin
      .from('player_ratings')
      .select('*')
      .eq('group_id', PR_GROUP_ID)
      .eq('user_id', ALICE_ID)
      .single();
    expect(error).toBeNull();
    expect(data!.decisions).toBe(ALICE_GAMES);
    expect(data!.decisions_to_qualify).toBe(0);
    expect(data!.rating).not.toBeNull();
    // v2: p = (16w + 0.5×3push + 20) / (25 + 40) = 37.5/65 ≈ 57.7% shrunk cover ⇒ rating ≈ 1554,
    // comfortably above 1500 (hand-computed from the v2 formula). Not pinned to the exact integer
    // here — that's computeRatings.test.ts's job — so this suite only re-verifies the DB round
    // trip (view → fold → upsert → read), not the pure fold's math a second time.
    expect(data!.rating!).toBeGreaterThan(RATING_PAR);
    // v2's season delta compares the latest season against every PRIOR season combined
    // (order-independently). This fixture seeds only one season (2087), so there is no prior
    // season to compare against and the delta is null — unlike v1, where a qualified player
    // always had a non-null delta (measured from a per-season soft-reset anchor that v2 removed).
    expect(data!.season_delta).toBeNull();
  });

  test('a player under the gate stays Unrated with a decisions-to-go count', async () => {
    const { data, error } = await admin
      .from('player_ratings')
      .select('*')
      .eq('group_id', PR_GROUP_ID)
      .eq('user_id', BOB_ID)
      .single();
    expect(error).toBeNull();
    expect(data!.rating).toBeNull();
    expect(data!.season_delta).toBeNull();
    expect(data!.decisions).toBe(BOB_GAMES);
    expect(data!.decisions_to_qualify).toBe(MIN_QUALIFIED_DECISIONS - BOB_GAMES);
  });

  test('the rebuild is idempotent — a second run yields the same rating', async () => {
    const first = await admin
      .from('player_ratings')
      .select('rating, decisions, season_delta')
      .eq('group_id', PR_GROUP_ID)
      .eq('user_id', ALICE_ID)
      .single();
    await rebuildPlayerRatings(admin);
    const second = await admin
      .from('player_ratings')
      .select('rating, decisions, season_delta')
      .eq('group_id', PR_GROUP_ID)
      .eq('user_id', ALICE_ID)
      .single();
    expect(second.data).toEqual(first.data);
  });

  test('no row is written for a group with no settled decisions', async () => {
    const { data, error } = await admin
      .from('player_ratings')
      .select('user_id')
      .eq('group_id', OTHER_GROUP_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

// Atomic rebuild under real concurrency (#619, ADR-0032 §8 follow-up). Two overlapping full
// rebuilds against real Postgres — the vitest-mocked interleaving rebuild.test.ts used to exercise
// (#622's regression) is gone now that upsert+prune is one RPC call; what's left to prove can only
// be proven against a real DB with two real connections.
describe('atomic rebuild under concurrency (#619)', () => {
  test('two real concurrent rebuilds against identical inputs never lose rows', async () => {
    // Both calls fold the SAME settled decisions (nothing changes between them), so both write
    // an identical row set — only the winning call's computed_at stamp should remain, and the
    // full set of players (Alice + Bob-under-gate has no row, so just Alice) survives regardless
    // of which call's transaction commits last.
    const [a, b] = await Promise.allSettled([
      rebuildPlayerRatings(admin),
      rebuildPlayerRatings(admin)
    ]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('fulfilled');

    const { data, error } = await admin
      .from('player_ratings')
      .select('user_id, rating')
      .eq('group_id', PR_GROUP_ID)
      .eq('user_id', ALICE_ID)
      .single();
    expect(error).toBeNull();
    expect(data!.rating).not.toBeNull();
  });

  test('the RPC serializes on its own advisory lock: a concurrent caller blocks until the holder commits', async () => {
    // Prove the mechanism directly rather than trying to force the upsert/prune race: acquire the
    // exact advisory lock key _rebuild_player_ratings takes (hashtext('player_ratings_rebuild'))
    // in one held-open transaction, then call the real RPC from a second connection and confirm it
    // stays pending until the first transaction releases the lock. If a future change dropped the
    // lock from the function, this call would resolve immediately instead of staying pending.
    const holder = postgres(LOCAL_DB_URL);
    const caller = postgres(LOCAL_DB_URL);
    try {
      let releaseHold!: () => void;
      const held = new Promise<void>((resolve) => (releaseHold = resolve));

      const holderTx = holder.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext('player_ratings_rebuild'))`;
        await held;
      });
      // Give the holder a moment to actually acquire the lock before racing the caller.
      await new Promise((r) => setTimeout(r, 50));

      const blockedCall = caller`
        select public._rebuild_player_ratings('[]'::jsonb, now())
      `;
      const raceResult = await Promise.race([
        blockedCall.then(() => 'resolved' as const),
        new Promise<'still-pending'>((r) => setTimeout(() => r('still-pending'), 300))
      ]);
      expect(raceResult).toBe('still-pending');

      releaseHold();
      await holderTx;
      await blockedCall; // now unblocks
    } finally {
      await holder.end();
      await caller.end();
      // The blocking call above ran with an empty rows array and now() — restore real ratings.
      await rebuildPlayerRatings(admin);
    }
  });
});

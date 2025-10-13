import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureTeams,
  ensureSeasonAndWeek,
  ensureSettings
} from './fixtures/db';

// ---- Test setup -------------------------------------------------------------

const admin = createServiceClient();
const EXTERNAL_ID = `lock-pick-int-${Date.now()}`;

async function createGameWithActiveLine(
  weekId: number,
  homeTeamId: number,
  awayTeamId: number,
  kickoffISO: string
) {
  // Create game
  const { data: game, error: gErr } = await admin
    .from('games')
    .insert({
      week_id: weekId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      external_game_id: EXTERNAL_ID,
      commence_time: kickoffISO
    })
    .select('id')
    .single();
  if (gErr) throw new Error(`create game: ${gErr.message}`);
  const gameId = game!.id as string;

  // Insert two candidate lines (home active)
  const now = new Date().toISOString();
  const { error: lineErr } = await admin.from('game_lines').insert([
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: homeTeamId,
      spread_value: -6.5,
      is_active_line: true,
      fetched_at: now
    },
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: awayTeamId,
      spread_value: 6.5,
      is_active_line: false,
      fetched_at: now
    }
  ]);
  if (lineErr) throw new Error(`insert line: ${lineErr.message}`);

  return gameId;
}

describe('lock_pick RPC integration', () => {
  let userId: string;
  let weekId: number;
  let homeTeamId: number;
  let awayTeamId: number;
  let gameId: string;

  beforeAll(async () => {
    // Core seed
    await ensureCoreTestUsers(admin, true);
    await ensureTeams(admin);
    weekId = (await ensureSeasonAndWeek(admin, 2024, 1)).weekId;
    await ensureSettings(admin);

    // Resolve teams (Chiefs/Bills from fixtures)
    const { data: teams, error: tErr } = await admin.from('teams').select('id, name');
    if (tErr) throw tErr;
    if (!teams?.length) throw new Error('Teams not seeded');
    homeTeamId = teams!.find((t) => t.name === 'Kansas City Chiefs')!.id as number;
    awayTeamId = teams!.find((t) => t.name === 'Buffalo Bills')!.id as number;

    // Choose a user
    const { data: users, error: uErr } = await admin.from('users').select('id, display_name');
    if (uErr) throw uErr;
    userId = users!.find((u) => u.display_name === TEST_USERS[0].display)!.id as string;

    // Clean any prior artifacts
    await admin.from('picks').delete().eq('game_id', EXTERNAL_ID); // safe if you store external id there
    await admin.from('game_lines').delete().eq('game_id', EXTERNAL_ID);
    await admin.from('games').delete().eq('external_game_id', EXTERNAL_ID);

    // Create fresh game with a kickoff in the future (so locking is allowed)
    const kickoff = new Date(Date.now() + 5 * 60_000).toISOString(); // +5 minutes
    gameId = await createGameWithActiveLine(weekId, homeTeamId, awayTeamId, kickoff);
  });

  afterAll(async () => {
    // Best-effort cleanup
    await admin.from('picks').delete().eq('game_id', gameId);
    await admin.from('game_lines').delete().eq('game_id', gameId);
    await admin.from('games').delete().eq('id', gameId);
  });

  it('locks a pick successfully and persists expected fields', async () => {
    const asUser = createUserClient(userId);

    // Precondition: user has no pick yet
    const { data: pre } = await admin
      .from('picks')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', userId);
    expect(pre?.length ?? 0).toBe(0);

    const { data, error } = await asUser.rpc('lock_pick', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'H'
    });
    expect(error).toBeNull();

    const row = (Array.isArray(data) ? data?.[0] : data) as any;
    expect(row?.ok).toBe(true);
    expect(row?.user_id).toBe(userId);
    expect(row?.game_id).toBe(gameId);
    expect(row?.picked_side).toBe('home');
    expect(row?.weight).toBe('H');
    expect(row?.locked_at).toBeTruthy();

    // Confirm persisted snapshot shape
    const { data: persisted, error: pErr } = await admin
      .from('picks')
      .select('picked_team_id, locked_spread_team_id, locked_spread_value, weight, locked_at')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .maybeSingle();
    expect(pErr).toBeNull();
    expect(persisted?.weight).toBe('H');
    expect(persisted?.locked_spread_team_id).toBe(homeTeamId);
    expect(typeof persisted?.locked_spread_value).toBe('number');
  });

  it('handles duplicate lock attempts (idempotent or guarded)', async () => {
    const asUser = createUserClient(userId);

    // First lock succeeds
    const first = await asUser.rpc('lock_pick', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'M'
    });
    expect(first.error).toBeNull();

    // Second lock behavior depends on your SQL (idempotent vs guarded).
    // Accept either: error message OR a single ok row with same selection.
    const second = await asUser.rpc('lock_pick', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'L'
    });

    if (second.error) {
      // Guarded path (already locked)
      const msg = second.error.message.toLowerCase();
      expect(/already.*locked|duplicate|conflict/.test(msg)).toBe(true);
    } else {
      // Idempotent/overwrite path (confirm single row and fields sane)
      const r = (Array.isArray(second.data) ? second.data[0] : second.data) as any;
      expect(r?.ok).toBe(true);
      expect(r?.user_id).toBe(userId);
      expect(r?.game_id).toBe(gameId);
      // If your function allows weight change, we at least assert it’s a valid code
      expect(['L', 'M', 'H', 'A']).toContain(r?.weight);
    }
  });

  it('rejects invalid weight code', async () => {
    const asUser = createUserClient(userId);
    const res = await asUser.rpc('lock_pick', {
      p_game_id: gameId,
      p_side: 'home',
      // @ts-expect-error: intentionally wrong for runtime test
      p_weight: 'Z'
    });
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
    // looser assertion to tolerate different SQL wording
    const msg = res.error!.message.toLowerCase();
    expect(/invalid.*weight|weight.*enum|bad input|check constraint/.test(msg)).toBe(true);
  });

  it('prevents locking after kickoff (lock window closed)', async () => {
    // Move kickoff into the past to simulate started game
    const past = new Date(Date.now() - 60_000).toISOString();
    const { error: updErr } = await admin
      .from('games')
      .update({ commence_time: past })
      .eq('id', gameId);
    expect(updErr).toBeNull();

    const asUser = createUserClient(userId);
    const res = await asUser.rpc('lock_pick', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'H'
    });

    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
    const msg = res.error!.message.toLowerCase();
    // allow a few likely phrasings depending on your SQL
    expect(/kickoff|already.*started|lock.*closed|too late/.test(msg)).toBe(true);
  });
});

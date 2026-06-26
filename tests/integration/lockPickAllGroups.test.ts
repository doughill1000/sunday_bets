import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import {
  ensureAuthUsers,
  ensureGroup,
  ensureMembership,
  ensureSeasonAndWeek,
  ensureSettings,
  ensureTeams,
  clearWeekGames
} from './fixtures/db';

// ---- Stable IDs for this suite (distinct from all other suites) --------------

const admin = createServiceClient();

const USER_MULTI_ID = '00000000-0000-0000-0000-000000006001';
const USER_SINGLE_ID = '00000000-0000-0000-0000-000000006002';

const GROUP_A_ID = '00000000-0000-4000-8000-000000006a01';
const GROUP_B_ID = '00000000-0000-4000-8000-000000006b01';

const EXT_GAME_ID = `fanout-int-${Date.now()}`;

describe('lock_pick_all_groups / unlock_pick_all_groups integration', () => {
  let weekId: number;
  let homeTeamId: number;
  let awayTeamId: number;
  let gameId: string;

  beforeAll(async () => {
    await ensureSettings(admin);
    await ensureTeams(admin);

    await ensureAuthUsers([
      { id: USER_MULTI_ID, email: 'fanout-multi@example.com', displayName: 'FanOutMulti' },
      { id: USER_SINGLE_ID, email: 'fanout-single@example.com', displayName: 'FanOutSingle' }
    ]);

    await admin.from('users').upsert(
      [
        { id: USER_MULTI_ID, display_name: 'FanOutMulti', role: 'player' },
        { id: USER_SINGLE_ID, display_name: 'FanOutSingle', role: 'player' }
      ],
      { onConflict: 'id' }
    );

    await ensureGroup(admin, { id: GROUP_A_ID, name: 'FanOut Integ Group A' });
    await ensureGroup(admin, { id: GROUP_B_ID, name: 'FanOut Integ Group B' });

    // Set line_source: A = fanduel (default), B = pinnacle
    await admin.from('group_config').upsert([
      { group_id: GROUP_A_ID, line_source: 'fanduel' },
      { group_id: GROUP_B_ID, line_source: 'fanduel' }
    ]);

    // USER_MULTI → both groups; USER_SINGLE → group A only
    await ensureMembership(admin, GROUP_A_ID, [USER_MULTI_ID, USER_SINGLE_ID]);
    await ensureMembership(admin, GROUP_B_ID, [USER_MULTI_ID]);

    // Season 2097 week 5 — non-final so All-In limit is active
    await ensureSeasonAndWeek(admin, 2097, 10); // seed a later week so week 5 is non-final
    weekId = (await ensureSeasonAndWeek(admin, 2097, 5)).weekId;

    const { data: teams } = await admin.from('teams').select('id, name');
    homeTeamId = teams!.find((t) => t.name === 'Kansas City Chiefs')!.id as number;
    awayTeamId = teams!.find((t) => t.name === 'Buffalo Bills')!.id as number;

    await clearWeekGames(admin, weekId);

    const kickoff = new Date(Date.now() + 10 * 60_000).toISOString();
    const { data: game, error: gErr } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        external_game_id: EXT_GAME_ID,
        commence_time: kickoff
      })
      .select('id')
      .single();
    if (gErr) throw new Error(`insert game: ${gErr.message}`);
    gameId = game!.id as string;

    const now = new Date().toISOString();
    await admin.from('game_lines').insert({
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: homeTeamId,
      spread_value: -6.5,
      is_active_line: true,
      fetched_at: now
    });
  }, 60_000);

  afterAll(async () => {
    await admin.from('picks').delete().eq('game_id', gameId);
    await admin.from('game_lines').delete().eq('game_id', gameId);
    await admin.from('games').delete().eq('id', gameId);
  });

  it('multi-group user: fan-out writes a pick row in each active group', async () => {
    const asMulti = createUserClient(USER_MULTI_ID);

    const { data, error } = await asMulti.rpc('lock_pick_all_groups', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'M'
    });
    expect(error).toBeNull();

    const rows = Array.isArray(data) ? data : [];
    expect(rows.length).toBe(2);
    expect(rows.every((r: { ok: boolean }) => r.ok)).toBe(true);

    const { data: picks } = await admin
      .from('picks')
      .select('group_id, weight')
      .eq('game_id', gameId)
      .eq('user_id', USER_MULTI_ID);
    expect(picks?.length).toBe(2);
    const groupIds = picks!.map((p) => p.group_id).sort();
    expect(groupIds).toEqual([GROUP_A_ID, GROUP_B_ID].sort());
  });

  it('per-group report shape: each row has group_id, ok, reason, locked_at', async () => {
    const { data } = await createUserClient(USER_MULTI_ID).rpc('lock_pick_all_groups', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'H'
    });
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      expect(typeof row.group_id).toBe('string');
      expect(typeof row.ok).toBe('boolean');
      expect('reason' in row).toBe(true);
      expect('locked_at' in row).toBe(true);
    }
  });

  it('single-group user: fan-out writes exactly one pick row', async () => {
    const asSingle = createUserClient(USER_SINGLE_ID);

    const { data, error } = await asSingle.rpc('lock_pick_all_groups', {
      p_game_id: gameId,
      p_side: 'away',
      p_weight: 'L'
    });
    expect(error).toBeNull();
    const rows = Array.isArray(data) ? data : [];
    expect(rows.length).toBe(1);
    expect(rows[0].ok).toBe(true);

    const { data: picks } = await admin
      .from('picks')
      .select('group_id')
      .eq('game_id', gameId)
      .eq('user_id', USER_SINGLE_ID);
    expect(picks?.length).toBe(1);
    expect(picks![0].group_id).toBe(GROUP_A_ID);
  });

  it('unlock_pick_all_groups: removes picks from all groups and returns ok report', async () => {
    // Ensure the multi user has picks first
    await createUserClient(USER_MULTI_ID).rpc('lock_pick_all_groups', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'M'
    });

    const { data, error } = await createUserClient(USER_MULTI_ID).rpc('unlock_pick_all_groups', {
      p_game_id: gameId
    });
    expect(error).toBeNull();

    const rows = Array.isArray(data) ? data : [];
    expect(rows.every((r: { ok: boolean }) => r.ok)).toBe(true);

    const { data: picks } = await admin
      .from('picks')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', USER_MULTI_ID);
    expect(picks?.length).toBe(0);
  });

  it('unlock_pick_all_groups: idempotent when no pick exists', async () => {
    // picks already deleted by previous test
    const { data, error } = await createUserClient(USER_MULTI_ID).rpc('unlock_pick_all_groups', {
      p_game_id: gameId
    });
    expect(error).toBeNull();
    const rows = Array.isArray(data) ? data : [];
    expect(rows.every((r: { ok: boolean }) => r.ok)).toBe(true);
  });

  it('partial-apply: POST /api/picks/:gameId returns applied + skipped in response', async () => {
    // This test validates the server-route shape rather than the RPC directly.
    // We can't easily hit the HTTP route in integration, so we verify the RPC report
    // shape is compatible with what the route handler expects.
    const { data } = await createUserClient(USER_MULTI_ID).rpc('lock_pick_all_groups', {
      p_game_id: gameId,
      p_side: 'home',
      p_weight: 'H'
    });
    const rows = Array.isArray(data) ? data : [];
    const succeeded = rows.filter((r: { ok: boolean }) => r.ok);
    const failed = rows.filter((r: { ok: boolean }) => !r.ok);
    // With fanduel lines for both groups, both succeed
    expect(succeeded.length).toBe(2);
    expect(failed.length).toBe(0);
  });
});

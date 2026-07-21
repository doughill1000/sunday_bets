import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createServiceClient, createUserClient } from './_auth';
import {
  TEST_USERS,
  ensureCoreTestUsers,
  ensureGroupMembership,
  ensureTeams,
  ensureSeasonAndWeek,
  ensureSettings,
  clearWeekGames,
  ensureGroup,
  ensureMembership,
  ensureAuthUsers
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
      spread_value: 6.5,
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
    // Core seed. This suite owns week 3 of the 2024 season so its game never
    // collides (via uq_games_matchup) with games seeded by the other suites.
    await ensureCoreTestUsers(admin, true);
    await ensureTeams(admin);
    weekId = (await ensureSeasonAndWeek(admin, 2024, 3)).weekId;
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

    // Ensure group membership exists so lock_pick can resolve the user's group.
    // Without this, the test is order-dependent: it only passes if games.test.ts
    // or grading.test.ts ran first (they happen to seed the same membership).
    await ensureGroupMembership(admin, [userId]);

    // Clear any games this suite owns (picks/game_lines cascade) so a crashed
    // prior run can't leave a matchup behind that collides with uq_games_matchup.
    await clearWeekGames(admin, weekId);

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

// ---------------------------------------------------------------------------
// All-In constraint: within-group enforcement + cross-group independence
// ---------------------------------------------------------------------------
//
// lock_pick auto-resolves the caller's group via:
//   SELECT group_id FROM group_memberships WHERE user_id = auth.uid()
//   ORDER BY joined_at, group_id LIMIT 1
//
// Strategy:
//   - userGroupA: only member of groupA → always resolves to groupA
//   - userGroupB: only member of groupB → always resolves to groupB
//
// This suite owns season 2096 (weeks 1 and 18) and two stable group UUIDs so it
// never collides with the original suite (2024 week 3) or other test files.
// It deliberately uses a NON-final week (1, with a later week 18 present) so the
// final-week-unlimited-all-in exception in lock_pick does NOT skip the per-week
// All-In enforcement this suite asserts.

describe('All-In constraint — within-group and cross-group independence', () => {
  const GROUP_A_ID = '00000000-0000-4000-8000-000000001a05';
  const GROUP_B_ID = '00000000-0000-4000-8000-000000001b05';

  // Stable user IDs for this describe block (distinct from TEST_USERS)
  const USER_A_ID = '00000000-0000-0000-0000-000000005001';
  const USER_B_ID = '00000000-0000-0000-0000-000000005002';

  let weekId: number;
  let homeTeamId: number;
  let awayTeamId: number;
  // game2 uses a DIFFERENT matchup (Eagles/Cowboys) — uq_games_matchup is
  // order-independent (LEAST/GREATEST of the team ids), so reusing the KC/BUF
  // pair (even with sides swapped) in the same week would collide.
  let altHomeTeamId: number;
  let altAwayTeamId: number;
  // Two games in the same week — needed to test "second All-In rejected within group"
  let gameId1: string;
  let gameId2: string;

  const EXT_ID_1 = `allin-cross-group-g1-${Date.now()}`;
  const EXT_ID_2 = `allin-cross-group-g2-${Date.now()}`;

  async function insertGameWithLine(
    weekId: number,
    home: number,
    away: number,
    externalId: string,
    kickoffISO: string
  ): Promise<string> {
    const { data: game, error: gErr } = await admin
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: home,
        away_team_id: away,
        external_game_id: externalId,
        commence_time: kickoffISO
      })
      .select('id')
      .single();
    if (gErr) throw new Error(`insertGameWithLine: ${gErr.message}`);
    const id = game!.id as string;
    const now = new Date().toISOString();
    const { error: lineErr } = await admin.from('game_lines').insert({
      game_id: id,
      source: 'fanduel',
      spread_team_id: home,
      spread_value: 6.5,
      is_active_line: true,
      fetched_at: now
    });
    if (lineErr) throw new Error(`insertGameWithLine line: ${lineErr.message}`);
    return id;
  }

  beforeAll(async () => {
    // Ensure settings row
    await ensureSettings(admin);

    // Seed auth.users for the two dedicated users
    await ensureAuthUsers([
      { id: USER_A_ID, email: 'allin-user-a@example.com', displayName: 'AllInUserA' },
      { id: USER_B_ID, email: 'allin-user-b@example.com', displayName: 'AllInUserB' }
    ]);

    // Upsert public.users
    const { error: userErr } = await admin.from('users').upsert(
      [
        { id: USER_A_ID, display_name: 'AllInUserA', role: 'player' },
        { id: USER_B_ID, display_name: 'AllInUserB', role: 'player' }
      ],
      { onConflict: 'id' }
    );
    if (userErr) throw new Error('upsert users: ' + userErr.message);

    // Create two separate groups
    await ensureGroup(admin, { id: GROUP_A_ID, name: 'AllIn Group A' });
    await ensureGroup(admin, { id: GROUP_B_ID, name: 'AllIn Group B' });

    // userA → groupA only; userB → groupB only
    await ensureMembership(admin, GROUP_A_ID, [USER_A_ID]);
    await ensureMembership(admin, GROUP_B_ID, [USER_B_ID]);

    // Resolve teams (reuse canonical teams)
    await ensureTeams(admin);
    const { data: teams, error: tErr } = await admin.from('teams').select('id, name');
    if (tErr) throw tErr;
    homeTeamId = teams!.find((t) => t.name === 'Kansas City Chiefs')!.id as number;
    awayTeamId = teams!.find((t) => t.name === 'Buffalo Bills')!.id as number;
    altHomeTeamId = teams!.find((t) => t.name === 'Philadelphia Eagles')!.id as number;
    altAwayTeamId = teams!.find((t) => t.name === 'Dallas Cowboys')!.id as number;

    // Dedicated season 2096. Seed a LATER week (18) first so the test week (1) is
    // not the season's final week — otherwise lock_pick's final-week-unlimited
    // exception would skip the All-In-per-week check this suite verifies.
    await ensureSeasonAndWeek(admin, 2096, 18);
    weekId = (await ensureSeasonAndWeek(admin, 2096, 1)).weekId;

    // Clear stale games from this week before creating new ones
    await clearWeekGames(admin, weekId);

    const kickoff = new Date(Date.now() + 10 * 60_000).toISOString(); // +10 min
    gameId1 = await insertGameWithLine(weekId, homeTeamId, awayTeamId, EXT_ID_1, kickoff);
    gameId2 = await insertGameWithLine(weekId, altHomeTeamId, altAwayTeamId, EXT_ID_2, kickoff);
  }, 60_000);

  afterAll(async () => {
    // Best-effort cleanup
    await admin.from('picks').delete().eq('game_id', gameId1);
    await admin.from('picks').delete().eq('game_id', gameId2);
    await admin.from('game_lines').delete().eq('game_id', gameId1);
    await admin.from('game_lines').delete().eq('game_id', gameId2);
    await admin.from('games').delete().in('id', [gameId1, gameId2]);
  });

  it('All-In is enforced within a single group: first succeeds, second is rejected', async () => {
    const asUserA = createUserClient(USER_A_ID);

    // First All-In in groupA / week 5 — must succeed
    const first = await asUserA.rpc('lock_pick', {
      p_game_id: gameId1,
      p_side: 'home',
      p_weight: 'A'
    });
    expect(first.error).toBeNull();
    const firstRow = (Array.isArray(first.data) ? first.data[0] : first.data) as any;
    expect(firstRow?.ok).toBe(true);
    expect(firstRow?.weight).toBe('A');

    // Second All-In in the SAME group / SAME week — must be rejected
    const second = await asUserA.rpc('lock_pick', {
      p_game_id: gameId2,
      p_side: 'home',
      p_weight: 'A'
    });
    expect(second.data).toBeNull();
    expect(second.error).toBeTruthy();
    const msg = second.error!.message.toLowerCase();
    expect(/all.?in.*used|already.*used|used.*this.*week/.test(msg)).toBe(true);
  });

  it('All-In is independent across groups: each group allows its own All-In', async () => {
    // userA already used All-In in groupA (from the test above).
    // userB in groupB should be able to lock All-In freely — the constraint
    // only checks within the resolved group, not globally.
    const asUserB = createUserClient(USER_B_ID);

    // userB locks All-In in groupB / week 5 — must succeed (independent of groupA)
    const res = await asUserB.rpc('lock_pick', {
      p_game_id: gameId1,
      p_side: 'home',
      p_weight: 'A'
    });
    expect(res.error).toBeNull();
    const row = (Array.isArray(res.data) ? res.data[0] : res.data) as any;
    expect(row?.ok).toBe(true);
    expect(row?.weight).toBe('A');

    // Confirm the pick was stored under groupB
    const { data: pick, error: pickErr } = await admin
      .from('picks')
      .select('group_id, weight')
      .eq('game_id', gameId1)
      .eq('user_id', USER_B_ID)
      .maybeSingle();
    expect(pickErr).toBeNull();
    expect(pick?.group_id).toBe(GROUP_B_ID);
    expect(pick?.weight).toBe('A');
  });

  it('same week allows All-In in group A and All-In in group B without interference', async () => {
    // At this point:
    //   groupA / week 5 / userA → All-In on gameId1 (locked above)
    //   groupB / week 5 / userB → All-In on gameId1 (locked above)
    //
    // Verify both picks independently coexist and neither's All-In blocks the other.
    const [{ data: pickA, error: errA }, { data: pickB, error: errB }] = await Promise.all([
      admin
        .from('picks')
        .select('group_id, weight')
        .eq('game_id', gameId1)
        .eq('user_id', USER_A_ID)
        .maybeSingle(),
      admin
        .from('picks')
        .select('group_id, weight')
        .eq('game_id', gameId1)
        .eq('user_id', USER_B_ID)
        .maybeSingle()
    ]);

    expect(errA).toBeNull();
    expect(errB).toBeNull();

    expect(pickA?.group_id).toBe(GROUP_A_ID);
    expect(pickA?.weight).toBe('A');

    expect(pickB?.group_id).toBe(GROUP_B_ID);
    expect(pickB?.weight).toBe('A');

    // The two picks are in separate groups — the same game/week allows
    // one All-In per group, not one All-In globally.
    expect(pickA?.group_id).not.toBe(pickB?.group_id);
  });
});

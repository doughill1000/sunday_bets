import type { SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';

// PostgREST/GoTrue won't let us write the auth schema, so auth.users seeding goes
// through a direct Postgres connection (same approach as supabase/scripts/seed-demo).
// The local Supabase DB is reachable at this fixed URL; allow an override for CI.
const LOCAL_DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Canonical test IDs and emails so multiple tests can share fixtures deterministically.
export const TEST_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com', display: 'test1' },
  { id: '00000000-0000-0000-0000-000000000002', email: 'test2@example.com', display: 'test2' },
  { id: '00000000-0000-0000-0000-000000000003', email: 'test3@example.com', display: 'test3' }
];

// New: direct seeding of public.users (bypasses need for auth.users exposure in PostgREST)
export async function ensureCoreTestUsers(supabase: SupabaseClient, elevateFirstToAdmin = true) {
  // Step 2: upsert public.users referencing existing auth user ids
  const now = new Date().toISOString();
  const upsertPayload = TEST_USERS.map((u) => ({
    id: u.id,
    display_name: u.display,
    role: 'player',
    created_at: now
  }));
  const { error: userErr } = await supabase
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' });
  if (userErr) throw new Error('Failed to upsert users: ' + userErr.message);

  // Step 3: elevate first user to admin (optional)
  if (elevateFirstToAdmin) {
    const { error: elevateErr } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', TEST_USERS[0].id);
    if (elevateErr) throw new Error('Failed to elevate admin: ' + elevateErr.message);
  }

  // Step 4: verify count
  const { data: verify, error: verifyErr } = await supabase.from('users').select('id');
  if (verifyErr) throw new Error('Failed to verify users: ' + verifyErr.message);
  if (!verify || verify.length < 3)
    throw new Error('ensureCoreTestUsers: expected >=3 users, found ' + (verify?.length ?? 0));
}

export async function ensurePublicUsers(supabase: SupabaseClient, elevateFirstToAdmin = true) {
  await supabase
    .from('users')
    .upsert(TEST_USERS.map((u) => ({ id: u.id, display_name: u.display, role: 'player' })));
  if (elevateFirstToAdmin) {
    await supabase.from('users').update({ role: 'admin' }).eq('id', TEST_USERS[0].id);
  }
}

export async function ensureTeams(supabase: SupabaseClient) {
  // external_key is the ESPN/Odds abbreviation the schedule-sync and ESPN-finals paths
  // (ADR-0003/0025) match on via findTeamsByExternalKeys — seed it here (= short_name for
  // these four) so those suites don't each have to backfill it. Idempotent: same value on
  // a re-run and on a prod-cloned DB where it is already set.
  const { error } = await supabase.from('teams').upsert(
    [
      { name: 'Kansas City Chiefs', short_name: 'KC', external_key: 'KC' },
      { name: 'Buffalo Bills', short_name: 'BUF', external_key: 'BUF' },
      { name: 'Philadelphia Eagles', short_name: 'PHI', external_key: 'PHI' },
      { name: 'Dallas Cowboys', short_name: 'DAL', external_key: 'DAL' }
    ],
    { onConflict: 'name' }
  );
  if (error) throw new Error('ensureTeams failed: ' + error.message);
}

export interface SeasonWeekIds {
  seasonId: number;
  weekId: number;
}

export async function ensureSeasonAndWeek(
  supabase: SupabaseClient,
  year = 2024,
  weekNumber = 1
): Promise<SeasonWeekIds> {
  let seasonId: number | undefined;
  {
    const { data: created } = await supabase.from('seasons').insert({ year }).select('id').single();
    if (created) seasonId = created.id;
    if (!created) {
      const { data: existing } = await supabase
        .from('seasons')
        .select('id')
        .eq('year', year)
        .maybeSingle();
      if (existing) seasonId = existing.id;
    }
  }
  if (!seasonId) throw new Error('Could not resolve seasonId');

  const { data: weekRow } = await supabase
    .from('weeks')
    .insert({
      season_id: seasonId,
      week_number: weekNumber,
      start_ts: '2024-09-01T00:00:00Z',
      end_ts: '2024-09-08T00:00:00Z'
    })
    .select('id')
    .single();

  let weekId = weekRow?.id;
  if (!weekId) {
    const { data: existing } = await supabase
      .from('weeks')
      .select('id')
      .eq('season_id', seasonId)
      .eq('week_number', weekNumber)
      .maybeSingle();
    if (existing) weekId = existing.id;
  }
  if (!weekId) throw new Error('Could not resolve weekId');
  return { seasonId, weekId };
}

export async function ensureSettings(supabase: SupabaseClient) {
  const { error } = await supabase.from('settings').upsert({
    id: true,
    odds_api_monthly_cap: 500,
    odds_api_calls_used_current_month: 0,
    reset_on: null
  });
  if (error) throw new Error('ensureSettings failed: ' + error.message);
}

// The stable original group ID seeded in migration 0210_pick_group_foreign_keys.sql.
export const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

/**
 * Upsert a single row into the `groups` table.
 * Idempotent: on conflict with the given `id` the row is left unchanged.
 *
 * @param supabase - Supabase client (service-role recommended for tests)
 * @param opts.id  - UUID for the group; must be a stable, collision-free value
 * @param opts.name - Display name; defaults to `'Test Group <id>'` when omitted
 */
export async function ensureGroup(
  supabase: SupabaseClient,
  opts: { id: string; name?: string }
): Promise<void> {
  const name = opts.name ?? `Test Group ${opts.id}`;
  const { error } = await supabase
    .from('groups')
    .upsert({ id: opts.id, name }, { onConflict: 'id' });
  if (error) throw new Error(`ensureGroup(${opts.id}): failed to upsert group: ${error.message}`);
}

/**
 * Upsert `group_memberships` rows for each user in `userIds`.
 * Idempotent: existing (group_id, user_id) pairs are left unchanged.
 *
 * @param supabase  - Supabase client (service-role recommended for tests)
 * @param groupId   - UUID of the target group (must already exist)
 * @param userIds   - Array of user UUIDs to enrol
 * @param role      - Membership role; defaults to `'member'`
 */
export async function ensureMembership(
  supabase: SupabaseClient,
  groupId: string,
  userIds: string[],
  role: 'member' | 'commissioner' = 'member'
): Promise<void> {
  if (userIds.length === 0) return;
  const { error } = await supabase.from('group_memberships').upsert(
    userIds.map((id) => ({ group_id: groupId, user_id: id, role })),
    { onConflict: 'group_id,user_id' }
  );
  if (error)
    throw new Error(
      `ensureMembership(group=${groupId}): failed to upsert memberships: ${error.message}`
    );
}

/**
 * Seed auth.users rows for the given users so that public.users inserts satisfy
 * the users_id_fkey -> auth.users(id) foreign key. PostgREST/GoTrue won't let us
 * write the auth schema, so we use a direct Postgres connection. Idempotent:
 * existing rows (matched by id) are left untouched.
 *
 * Use this whenever a test needs users beyond the three seeded in supabase/seed.sql.
 */
export async function ensureAuthUsers(users: { id: string; email: string; displayName: string }[]) {
  if (users.length === 0) return;
  const sql = postgres(LOCAL_DB_URL);
  try {
    for (const u of users) {
      await sql`
        insert into auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) values (
          ${u.id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          ${u.email}, crypt('password', gen_salt('bf')), now(),
          ${sql.json({ provider: 'email', providers: ['email'] })},
          ${sql.json({ display_name: u.displayName })}, now(), now(),
          '', '', '', '', '', '', '', ''
        )
        on conflict (id) do nothing`;
    }
  } finally {
    await sql.end();
  }
}

/**
 * Delete auth.users rows by id. The public.users -> auth.users FK is
 * ON DELETE CASCADE, so this also removes the mirrored public.users rows.
 */
export async function deleteAuthUsers(ids: string[]) {
  if (ids.length === 0) return;
  const sql = postgres(LOCAL_DB_URL);
  try {
    await sql`delete from auth.users where id in ${sql(ids)}`;
  } finally {
    await sql.end();
  }
}

/**
 * Delete all games in a week. picks and game_lines reference games with
 * ON DELETE CASCADE, so they are removed too. Used to give matchup-scoped tests
 * a clean week, since uq_games_matchup forbids duplicate (week, team-pair) rows
 * and a crashed prior run could otherwise leave a colliding game behind.
 */
export async function clearWeekGames(supabase: SupabaseClient, weekId: number) {
  const { data: games, error } = await supabase.from('games').select('id').eq('week_id', weekId);
  if (error) throw new Error('clearWeekGames select: ' + error.message);
  const ids = (games ?? []).map((g) => g.id as string);
  if (ids.length === 0) return;
  const { error: delErr } = await supabase.from('games').delete().in('id', ids);
  if (delErr) throw new Error('clearWeekGames delete: ' + delErr.message);
}

/**
 * Backward-compatible wrapper around `ensureGroup` + `ensureMembership`.
 * Seeds the stable original group (ORIGINAL_GROUP_ID / 'Sunday Bets') and
 * enrolls the given users as `'member'`.
 *
 * Existing callers (e.g. lockPick.test.ts) continue to work unchanged.
 */
export async function ensureGroupMembership(supabase: SupabaseClient, userIds: string[]) {
  await ensureGroup(supabase, { id: ORIGINAL_GROUP_ID, name: 'Sunday Bets' });
  await ensureMembership(supabase, ORIGINAL_GROUP_ID, userIds);
}

// ---------------------------------------------------------------------------
// Two-group settlement fixture
// ---------------------------------------------------------------------------

/**
 * Stable IDs used by `seedTwoGroupSettlements`. Exported so callers can
 * reference them directly without re-calling the fixture.
 */
export const TWO_GROUP_IDS = {
  groupA: '00000000-0000-4000-8000-000000000aa1',
  groupB: '00000000-0000-4000-8000-000000000bb2'
} as const;

/**
 * The shape returned by `seedTwoGroupSettlements`.
 *
 * Groups A and B share `sharedUserId` but have divergent outcomes for that
 * user across the two groups (groupA: win in group A, loss in group B).
 * `exclusiveUserAId` only belongs to group A; `exclusiveUserBId` only to B.
 */
export interface TwoGroupSettlementsResult {
  /** UUID of group A */
  groupAId: string;
  /** UUID of group B */
  groupBId: string;
  /** Season ID (integer primary key) shared by both groups */
  seasonId: number;
  /** Season YEAR (e.g. 2099) — pass this to query functions that filter on `season_year` */
  seasonYear: number;
  /** Week ID (integer) shared by both groups */
  weekId: number;
  /** UUID of the game used in both groups */
  gameId: string;
  /** Integer team ID of the home team (Kansas City Chiefs) */
  homeTeamId: number;
  /** Integer team ID of the away team (Buffalo Bills) */
  awayTeamId: number;
  /**
   * User who is a member of BOTH groups.
   * Picked home (winner) in group A → outcome 'win'.
   * Picked away (loser) in group B  → outcome 'loss'.
   */
  sharedUserId: string;
  /** User who belongs only to group A; picked the winning side */
  exclusiveUserAId: string;
  /** User who belongs only to group B; picked the losing side */
  exclusiveUserBId: string;
  /**
   * Expected settlement outcomes after `grade_game` runs.
   * Callers can assert against these without hardcoding strings.
   */
  expectedOutcomes: {
    groupA: { [userId: string]: 'win' | 'loss' | 'missed' };
    groupB: { [userId: string]: 'win' | 'loss' | 'missed' };
  };
}

/**
 * Seed two distinct groups with overlapping membership and DIVERGENT settled
 * results for a shared user, then call `grade_game` so `pick_settlement` rows
 * are written. Safe to call multiple times (fully idempotent).
 *
 * Prerequisites: local Supabase must be running. The fixture calls
 * `ensureAuthUsers` internally for the three test-specific users before
 * inserting public.users or group memberships.
 *
 * The fixture owns **season year 2099, week 10** to avoid colliding with other
 * integration-test suites. `clearWeekGames` is called internally to remove any
 * game left over from a prior crashed run.
 *
 * @param supabase - Service-role Supabase client
 * @returns        - All IDs needed for cross-group isolation assertions
 */
export async function seedTwoGroupSettlements(
  supabase: SupabaseClient
): Promise<TwoGroupSettlementsResult> {
  // --- Stable user IDs for this fixture (distinct from TEST_USERS) ---
  const SHARED_USER_ID = '00000000-0000-0000-0000-000000002001';
  const EXCL_A_USER_ID = '00000000-0000-0000-0000-000000002002';
  const EXCL_B_USER_ID = '00000000-0000-0000-0000-000000002003';

  const TWO_GROUP_YEAR = 2099;
  const TWO_GROUP_WEEK = 10;

  // 1. Ensure auth.users exist (direct Postgres — bypasses GoTrue restriction)
  await ensureAuthUsers([
    { id: SHARED_USER_ID, email: 'shared-twogroup@example.com', displayName: 'SharedTwoGroup' },
    { id: EXCL_A_USER_ID, email: 'excl-a-twogroup@example.com', displayName: 'ExclATwoGroup' },
    { id: EXCL_B_USER_ID, email: 'excl-b-twogroup@example.com', displayName: 'ExclBTwoGroup' }
  ]);

  // 2. Upsert public.users (the handle_new_auth_user trigger may already have done this,
  //    but we upsert explicitly to guarantee role='player' and idempotency).
  const { error: userErr } = await supabase.from('users').upsert(
    [
      { id: SHARED_USER_ID, display_name: 'SharedTwoGroup', role: 'player' },
      { id: EXCL_A_USER_ID, display_name: 'ExclATwoGroup', role: 'player' },
      { id: EXCL_B_USER_ID, display_name: 'ExclBTwoGroup', role: 'player' }
    ],
    { onConflict: 'id' }
  );
  if (userErr) throw new Error(`seedTwoGroupSettlements: upsert users: ${userErr.message}`);

  // 3. Seed teams (reuse the canonical four; ensureTeams is idempotent on name)
  await ensureTeams(supabase);

  const { data: teamsData, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .in('name', ['Kansas City Chiefs', 'Buffalo Bills']);
  if (teamsErr || !teamsData || teamsData.length < 2)
    throw new Error(
      `seedTwoGroupSettlements: could not load teams: ${teamsErr?.message ?? 'missing rows'}`
    );
  const homeTeamId = teamsData.find((t) => t.name === 'Kansas City Chiefs')!.id as number;
  const awayTeamId = teamsData.find((t) => t.name === 'Buffalo Bills')!.id as number;

  // 4. Season (year 2099 avoids collision with all other test suites)
  let seasonId: number;
  {
    const { data: ins } = await supabase
      .from('seasons')
      .insert({ year: TWO_GROUP_YEAR })
      .select('id')
      .single();
    if (ins) {
      seasonId = ins.id as number;
    } else {
      const { data: existing, error: selErr } = await supabase
        .from('seasons')
        .select('id')
        .eq('year', TWO_GROUP_YEAR)
        .maybeSingle();
      if (selErr || !existing)
        throw new Error(
          `seedTwoGroupSettlements: could not resolve season: ${selErr?.message ?? 'not found'}`
        );
      seasonId = existing.id as number;
    }
  }

  // 5. Week (season_id, week_number upsert-safe via insert-or-select)
  let weekId: number;
  {
    const { data: ins } = await supabase
      .from('weeks')
      .insert({
        season_id: seasonId,
        week_number: TWO_GROUP_WEEK,
        // Far-future timestamps so the week is never "active" during real use.
        start_ts: '2099-09-01T00:00:00Z',
        end_ts: '2099-09-08T00:00:00Z'
      })
      .select('id')
      .single();
    if (ins) {
      weekId = ins.id as number;
    } else {
      const { data: existing, error: selErr } = await supabase
        .from('weeks')
        .select('id')
        .eq('season_id', seasonId)
        .eq('week_number', TWO_GROUP_WEEK)
        .maybeSingle();
      if (selErr || !existing)
        throw new Error(
          `seedTwoGroupSettlements: could not resolve week: ${selErr?.message ?? 'not found'}`
        );
      weekId = existing.id as number;
    }
  }

  // 6. Clear stale games from this week (handles crashed prior runs)
  await clearWeekGames(supabase, weekId);

  // 7. Insert game with final scores already set (home wins 34-24 → Chiefs cover 6.5)
  const EXTERNAL_ID = 'two-group-settlements-fixture-v1';
  let gameId: string;
  {
    const { data: ins, error: gErr } = await supabase
      .from('games')
      .insert({
        week_id: weekId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        external_game_id: EXTERNAL_ID,
        commence_time: '2099-09-05T18:00:00Z',
        status: 'final',
        final_scores: { home: 34, away: 24 }
      })
      .select('id')
      .single();
    if (gErr || !ins)
      throw new Error(`seedTwoGroupSettlements: insert game: ${gErr?.message ?? 'no data'}`);
    gameId = ins.id as string;
  }

  // 8. Active line (home/Chiefs favored by 6.5; Chiefs cover by 10 → home wins ATS)
  const { error: lineErr } = await supabase.from('game_lines').insert({
    game_id: gameId,
    source: 'fanduel',
    spread_team_id: homeTeamId,
    spread_value: 6.5,
    is_active_line: true
  });
  if (lineErr) throw new Error(`seedTwoGroupSettlements: insert line: ${lineErr.message}`);

  // 9. Groups
  await ensureGroup(supabase, { id: TWO_GROUP_IDS.groupA, name: 'Test Group A' });
  await ensureGroup(supabase, { id: TWO_GROUP_IDS.groupB, name: 'Test Group B' });

  // 10. Memberships
  //   Group A: shared + exclusive-A
  await ensureMembership(supabase, TWO_GROUP_IDS.groupA, [SHARED_USER_ID, EXCL_A_USER_ID]);
  //   Group B: shared + exclusive-B
  await ensureMembership(supabase, TWO_GROUP_IDS.groupB, [SHARED_USER_ID, EXCL_B_USER_ID]);

  const now = new Date().toISOString();

  // 11. Picks — divergent choices for the shared user across the two groups.
  //
  //   Group A picks:
  //     shared  → picks home (Chiefs, the winning side) → will settle 'win'
  //     excl-A  → picks home (Chiefs, the winning side) → will settle 'win'
  //
  //   Group B picks:
  //     shared  → picks away (Bills, the losing side)  → will settle 'loss'
  //     excl-B  → picks away (Bills, the losing side)  → will settle 'loss'
  //
  // This is the DIVERGENT settlement: same user, same game, different group → different outcome.
  const picksToInsert = [
    // Group A — both pick home (winner)
    {
      group_id: TWO_GROUP_IDS.groupA,
      user_id: SHARED_USER_ID,
      game_id: gameId,
      picked_team_id: homeTeamId,
      locked_spread_team_id: homeTeamId,
      locked_spread_value: 6.5,
      weight: 'M',
      locked_by: SHARED_USER_ID,
      locked_at: now
    },
    {
      group_id: TWO_GROUP_IDS.groupA,
      user_id: EXCL_A_USER_ID,
      game_id: gameId,
      picked_team_id: homeTeamId,
      locked_spread_team_id: homeTeamId,
      locked_spread_value: 6.5,
      weight: 'M',
      locked_by: EXCL_A_USER_ID,
      locked_at: now
    },
    // Group B — both pick away (loser)
    {
      group_id: TWO_GROUP_IDS.groupB,
      user_id: SHARED_USER_ID,
      game_id: gameId,
      picked_team_id: awayTeamId,
      locked_spread_team_id: homeTeamId,
      locked_spread_value: 6.5,
      weight: 'M',
      locked_by: SHARED_USER_ID,
      locked_at: now
    },
    {
      group_id: TWO_GROUP_IDS.groupB,
      user_id: EXCL_B_USER_ID,
      game_id: gameId,
      picked_team_id: awayTeamId,
      locked_spread_team_id: homeTeamId,
      locked_spread_value: 6.5,
      weight: 'M',
      locked_by: EXCL_B_USER_ID,
      locked_at: now
    }
  ];

  const { error: pickErr } = await supabase
    .from('picks')
    .upsert(picksToInsert, { onConflict: 'group_id,user_id,game_id' });
  if (pickErr) throw new Error(`seedTwoGroupSettlements: upsert picks: ${pickErr.message}`);

  // 12. Grade the game — writes pick_settlement rows for all groups
  const { error: gradeErr } = await supabase.rpc('grade_game', { p_game_id: gameId });
  if (gradeErr) throw new Error(`seedTwoGroupSettlements: grade_game failed: ${gradeErr.message}`);

  // 13. Refresh the leaderboard/stats matviews (issue #191) so callers that read them
  //     see the settlements this fixture just wrote (grade_game alone does not refresh).
  const { error: refreshErr } = await supabase.rpc('refresh_leaderboard_stats');
  if (refreshErr)
    throw new Error(
      `seedTwoGroupSettlements: refresh_leaderboard_stats failed: ${refreshErr.message}`
    );

  return {
    groupAId: TWO_GROUP_IDS.groupA,
    groupBId: TWO_GROUP_IDS.groupB,
    seasonId,
    seasonYear: TWO_GROUP_YEAR,
    weekId,
    gameId,
    homeTeamId,
    awayTeamId,
    sharedUserId: SHARED_USER_ID,
    exclusiveUserAId: EXCL_A_USER_ID,
    exclusiveUserBId: EXCL_B_USER_ID,
    expectedOutcomes: {
      groupA: {
        [SHARED_USER_ID]: 'win',
        [EXCL_A_USER_ID]: 'win'
      },
      groupB: {
        [SHARED_USER_ID]: 'loss',
        [EXCL_B_USER_ID]: 'loss'
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Self-signup user fixture
// ---------------------------------------------------------------------------

/**
 * Canonical stable ID and email for the no-membership self-signup test user.
 * Override via the opts parameter of `newSelfSignupUser` if you need a
 * second self-signup user in the same test run.
 */
export const SELF_SIGNUP_USER = {
  id: '00000000-0000-0000-0000-000000009001',
  email: 'self-signup@example.com'
} as const;

/**
 * The shape returned by `newSelfSignupUser`.
 */
export interface SelfSignupUserResult {
  /** UUID of the seeded user */
  id: string;
  /** Email address of the seeded user */
  email: string;
}

/**
 * Seed a self-sign-up user: inserts an `auth.users` row (via the direct-Postgres
 * path used by `ensureAuthUsers`) and lets the `handle_new_auth_user` trigger
 * mirror it into `public.users` with `role = 'player'`. No group membership is
 * created, simulating a brand-new user who has not yet joined any group.
 *
 * Idempotent: if the auth row already exists (`ON CONFLICT DO NOTHING`) the
 * trigger does not fire again, but `public.users` is also upserted explicitly
 * to guarantee the row exists regardless.
 *
 * @param supabase      - Service-role Supabase client
 * @param opts.id       - Override UUID (default: SELF_SIGNUP_USER.id)
 * @param opts.email    - Override email (default: SELF_SIGNUP_USER.email)
 * @returns             - The user's id and email
 */
export async function newSelfSignupUser(
  supabase: SupabaseClient,
  opts?: { id?: string; email?: string }
): Promise<SelfSignupUserResult> {
  const id = opts?.id ?? SELF_SIGNUP_USER.id;
  const email = opts?.email ?? SELF_SIGNUP_USER.email;
  const displayName = email.split('@')[0];

  // 1. Insert auth.users (mirrors handle_new_auth_user trigger behaviour).
  //    The trigger inserts public.users with role='player' on INSERT — we call
  //    ensureAuthUsers which is idempotent via ON CONFLICT (id) DO NOTHING.
  await ensureAuthUsers([{ id, email, displayName }]);

  // 2. Explicitly upsert public.users so idempotency holds even when the trigger
  //    already fired on an earlier run (trigger has ON CONFLICT (id) DO NOTHING,
  //    so we must upsert to guarantee the row is present).
  const { error: userErr } = await supabase
    .from('users')
    .upsert({ id, display_name: displayName, role: 'player' }, { onConflict: 'id' });
  if (userErr) throw new Error(`newSelfSignupUser: upsert public.users failed: ${userErr.message}`);

  // 3. Confirm no group memberships exist for this user (assert invariant).
  const { data: memberships, error: memErr } = await supabase
    .from('group_memberships')
    .select('group_id')
    .eq('user_id', id);
  if (memErr) throw new Error(`newSelfSignupUser: membership check failed: ${memErr.message}`);
  if (memberships && memberships.length > 0) {
    throw new Error(
      `newSelfSignupUser: expected no memberships for ${id} but found ${memberships.length}. ` +
        `Use deleteAuthUsers([id]) to clean up first, or pass a fresh id/email override.`
    );
  }

  return { id, email };
}

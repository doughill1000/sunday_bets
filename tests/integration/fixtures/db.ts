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
  const { error } = await supabase.from('teams').upsert(
    [
      { name: 'Kansas City Chiefs', short_name: 'KC' },
      { name: 'Buffalo Bills', short_name: 'BUF' },
      { name: 'Philadelphia Eagles', short_name: 'PHI' },
      { name: 'Dallas Cowboys', short_name: 'DAL' }
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

export async function ensureGroupMembership(supabase: SupabaseClient, userIds: string[]) {
  const { error: groupErr } = await supabase
    .from('groups')
    .upsert({ id: ORIGINAL_GROUP_ID, name: 'Sunday Bets' }, { onConflict: 'id' });
  if (groupErr)
    throw new Error('ensureGroupMembership: failed to upsert group: ' + groupErr.message);

  const { error: memberErr } = await supabase.from('group_memberships').upsert(
    userIds.map((id) => ({ group_id: ORIGINAL_GROUP_ID, user_id: id, role: 'member' })),
    { onConflict: 'group_id,user_id' }
  );
  if (memberErr)
    throw new Error('ensureGroupMembership: failed to upsert memberships: ' + memberErr.message);
}

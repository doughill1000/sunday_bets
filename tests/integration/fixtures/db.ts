import type { SupabaseClient } from '@supabase/supabase-js';

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
      { name: 'Buffalo Bills', short_name: 'BUF' }
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

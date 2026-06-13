import type { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { E2E_USER } from './test-user';

/**
 * Seeds the deterministic fixtures the E2E flows need into the LOCAL Supabase
 * stack. Auth users (admin@example.com / password123, etc.) already exist from
 * `supabase db reset`'s seed.sql; here we add the game data the picks and
 * leaderboard pages render. Idempotent so repeated local runs are safe.
 */
const SEASON_YEAR = 2026;
const WEEK_NUMBER = 1;
const GAME_TAG = 'e2e-game-1';

const DAY = 24 * 60 * 60 * 1000;

export default async function globalSetup(_config: FullConfig) {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    throw new Error(
      'E2E global-setup: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set (see .env.test or the CI env block).'
    );
  }

  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

  // E2E sign-in user — created via the admin API so it can actually
  // password-login (the seed.sql users can't). Idempotent across runs.
  const { error: userErr } = await supabase.auth.admin.createUser({
    email: E2E_USER.email,
    password: E2E_USER.password,
    email_confirm: true,
    user_metadata: { display_name: E2E_USER.displayName }
  });
  if (userErr && !/already|exists|registered/i.test(userErr.message)) {
    throw new Error('seed e2e user: ' + userErr.message);
  }

  // Teams
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .upsert(
      [
        { name: 'Kansas City Chiefs', short_name: 'KC' },
        { name: 'Buffalo Bills', short_name: 'BUF' }
      ],
      { onConflict: 'name' }
    )
    .select('id, short_name');
  if (teamErr) throw new Error('seed teams: ' + teamErr.message);
  const home = teams!.find((t) => t.short_name === 'KC')!;
  const away = teams!.find((t) => t.short_name === 'BUF')!;

  // Season (find-or-create)
  let seasonId: number;
  {
    const { data: existing } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', SEASON_YEAR)
      .maybeSingle();
    if (existing) {
      seasonId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('seasons')
        .insert({ year: SEASON_YEAR })
        .select('id')
        .single();
      if (error) throw new Error('seed season: ' + error.message);
      seasonId = data.id;
    }
  }

  // Active week — start_ts <= now <= end_ts so findActiveWeek() returns it.
  const startTs = new Date(Date.now() - DAY).toISOString();
  const endTs = new Date(Date.now() + 6 * DAY).toISOString();
  let weekId: number;
  {
    const { data: existing } = await supabase
      .from('weeks')
      .select('id')
      .eq('season_id', seasonId)
      .eq('week_number', WEEK_NUMBER)
      .maybeSingle();
    if (existing) {
      weekId = existing.id;
      await supabase.from('weeks').update({ start_ts: startTs, end_ts: endTs }).eq('id', weekId);
    } else {
      const { data, error } = await supabase
        .from('weeks')
        .insert({ season_id: seasonId, week_number: WEEK_NUMBER, start_ts: startTs, end_ts: endTs })
        .select('id')
        .single();
      if (error) throw new Error('seed week: ' + error.message);
      weekId = data.id;
    }
  }

  // Game — kickoff in the future so picks remain editable/lockable.
  const commenceTime = new Date(Date.now() + 2 * DAY).toISOString();
  let gameId: string;
  {
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('external_game_id', GAME_TAG)
      .maybeSingle();
    const payload = {
      week_id: weekId,
      home_team_id: home.id,
      away_team_id: away.id,
      external_game_id: GAME_TAG,
      status: 'scheduled',
      commence_time: commenceTime
    };
    if (existing) {
      gameId = existing.id;
      await supabase.from('games').update(payload).eq('id', gameId);
    } else {
      const { data, error } = await supabase.from('games').insert(payload).select('id').single();
      if (error) throw new Error('seed game: ' + error.message);
      gameId = data.id;
    }
  }

  // Start each run from an unlocked board: clear any pick a prior run locked
  // (also must precede the game_lines delete — picks reference locked_line_id).
  await supabase.from('picks').delete().eq('game_id', gameId);

  // Lines — one active line (home favored) plus the inactive mirror.
  await supabase.from('game_lines').delete().eq('game_id', gameId);
  const now = new Date().toISOString();
  const { error: lineErr } = await supabase.from('game_lines').insert([
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: home.id,
      spread_value: -3.5,
      is_active_line: true,
      fetched_at: now
    },
    {
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: away.id,
      spread_value: 3.5,
      is_active_line: false,
      fetched_at: now
    }
  ]);
  if (lineErr) throw new Error('seed lines: ' + lineErr.message);

  console.log(
    `[e2e seed] season ${SEASON_YEAR} week ${WEEK_NUMBER} active; game ${away.short_name} @ ${home.short_name} with active line`
  );
}

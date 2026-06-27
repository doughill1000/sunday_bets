// Demo seed: builds a synthetic, DATE-ANCHORED season in the LOCAL Supabase DB so every
// UI screen/state (picks, leaderboard, admin) can be inspected, regardless of the real date.
//
// Why this exists: findActiveWeek()/getActiveWeekGames() only return a week where
// start_ts <= now <= end_ts. Cloning prod (pnpm db:clone:local) or the QA dump have all
// kickoffs in the past, so the "open picks before kickoff" states never render in the
// offseason. This script anchors an active week + 3 prior graded weeks to `new Date()`.
//
// Usage (intended on a freshly reset DB):
//   pnpm db:reset:demo      # supabase db reset --local --yes && pnpm db:seed:demo
//   pnpm db:seed:demo       # seed on top of an already-reset local DB
//
// The script is idempotent (find-or-create + upsert everywhere) and uses the service-role
// client, which bypasses RLS.
import 'dotenv/config';
import postgres from 'postgres';
import { makeClient, getTeamsMap } from '../backfill-picks/db.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Players -----------------------------------------------------------------
// All 6 have fixed ids. The first 3 match supabase/seed.sql; the rest are created here.
// The GoTrue admin API (auth.admin.*) is unusable on the current local CLI (it 500s on the
// hand-seeded auth.users rows), so we create/repair auth users via a direct Postgres
// connection (DATABASE_URL) instead. Password is the same for everyone: "password".
const PASSWORD = 'password';
// The stable v1.7 tenancy group (seeded by migration 0213_seed_original_group_config.sql).
// The migration seeds memberships only for users that exist at migration time, so the demo
// players created below must be enrolled here for group-scoped reads (picks_group_view) to work.
const GROUP_ID = '00000000-0000-4000-8000-000000000017';
interface Player {
  email: string;
  display: string;
  role: 'admin' | 'player';
  id: string;
}
const PLAYERS: Player[] = [
  {
    email: 'admin@example.com',
    display: 'Doug',
    role: 'admin',
    id: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'test2@example.com',
    display: 'Hank',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000002'
  },
  {
    email: 'test3@example.com',
    display: 'Charlie',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000003'
  },
  {
    email: 'demo4@example.com',
    display: 'Frank',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000004'
  },
  {
    email: 'demo5@example.com',
    display: 'Beth',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000005'
  },
  {
    email: 'demo6@example.com',
    display: 'Mike',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000006'
  }
];

// --- Teams (external_key is unique; getTeamsMap keys by short_name + external_key) -------
const TEAMS: Array<{ external_key: string; name: string; short_name: string }> = [
  { external_key: 'PHI', name: 'Philadelphia Eagles', short_name: 'PHI' },
  { external_key: 'DAL', name: 'Dallas Cowboys', short_name: 'DAL' },
  { external_key: 'KC', name: 'Kansas City Chiefs', short_name: 'KC' },
  { external_key: 'BUF', name: 'Buffalo Bills', short_name: 'BUF' },
  { external_key: 'SF', name: 'San Francisco 49ers', short_name: 'SF' },
  { external_key: 'BAL', name: 'Baltimore Ravens', short_name: 'BAL' },
  { external_key: 'CIN', name: 'Cincinnati Bengals', short_name: 'CIN' },
  { external_key: 'MIA', name: 'Miami Dolphins', short_name: 'MIA' },
  { external_key: 'DET', name: 'Detroit Lions', short_name: 'DET' },
  { external_key: 'GB', name: 'Green Bay Packers', short_name: 'GB' },
  { external_key: 'MIN', name: 'Minnesota Vikings', short_name: 'MIN' },
  { external_key: 'SEA', name: 'Seattle Seahawks', short_name: 'SEA' },
  { external_key: 'LAR', name: 'Los Angeles Rams', short_name: 'LAR' },
  { external_key: 'NYJ', name: 'New York Jets', short_name: 'NYJ' },
  { external_key: 'NE', name: 'New England Patriots', short_name: 'NE' },
  { external_key: 'PIT', name: 'Pittsburgh Steelers', short_name: 'PIT' }
];

type Fav = 'home' | 'away';
type Weight = 'L' | 'M' | 'H' | 'A';

// Prior, fully-graded weeks. Game 0 of each week is engineered to PUSH (margin 0), which
// pushes for *everyone* who picked it — guaranteeing the 'push' outcome appears.
interface PriorGame {
  home: string;
  away: string;
  fav: Fav;
  line: number; // points; stored as negative on the favourite
  finalHome: number;
  finalAway: number;
}
const PRIOR_WEEKS: PriorGame[][] = [
  // Week 1
  [
    { home: 'PHI', away: 'DAL', fav: 'home', line: 3, finalHome: 24, finalAway: 21 }, // push
    { home: 'KC', away: 'BUF', fav: 'home', line: 6.5, finalHome: 27, finalAway: 17 },
    { home: 'SF', away: 'BAL', fav: 'away', line: 2.5, finalHome: 20, finalAway: 27 },
    { home: 'CIN', away: 'MIA', fav: 'home', line: 1.5, finalHome: 21, finalAway: 20 },
    { home: 'DET', away: 'GB', fav: 'home', line: 7, finalHome: 24, finalAway: 21 }
  ],
  // Week 2
  [
    { home: 'MIN', away: 'SEA', fav: 'away', line: 4, finalHome: 20, finalAway: 24 }, // push
    { home: 'LAR', away: 'NYJ', fav: 'home', line: 3, finalHome: 30, finalAway: 10 },
    { home: 'NE', away: 'PIT', fav: 'home', line: 10, finalHome: 17, finalAway: 14 },
    { home: 'PHI', away: 'KC', fav: 'away', line: 6, finalHome: 14, finalAway: 28 },
    { home: 'DAL', away: 'BUF', fav: 'home', line: 2.5, finalHome: 27, finalAway: 20 }
  ],
  // Week 3
  [
    { home: 'SF', away: 'CIN', fav: 'home', line: 7, finalHome: 28, finalAway: 21 }, // push
    { home: 'BAL', away: 'MIA', fav: 'away', line: 3.5, finalHome: 24, finalAway: 20 },
    { home: 'DET', away: 'MIN', fav: 'home', line: 1, finalHome: 13, finalAway: 20 },
    { home: 'GB', away: 'SEA', fav: 'home', line: 4.5, finalHome: 31, finalAway: 24 },
    { home: 'LAR', away: 'NE', fav: 'away', line: 9, finalHome: 35, finalAway: 10 }
  ]
];

// The active week. g0/g1 have already kicked off (negative offset) and get graded; g2-g4
// are in the future and stay open. Picks for these are assigned in buildActiveWeekPicks().
interface ActiveGame {
  home: string;
  away: string;
  fav: Fav;
  line: number;
  offsetHours: number; // relative to now; negative = already kicked off
  finalHome?: number;
  finalAway?: number;
}
const ACTIVE_WEEK: ActiveGame[] = [
  {
    home: 'PIT',
    away: 'NYJ',
    fav: 'home',
    line: 3,
    offsetHours: -26,
    finalHome: 30,
    finalAway: 20
  }, // graded
  { home: 'KC', away: 'DAL', fav: 'home', line: 4, offsetHours: -3, finalHome: 20, finalAway: 21 }, // graded
  { home: 'BUF', away: 'PHI', fav: 'home', line: 2.5, offsetHours: 22 }, // future — selection (editable)
  { home: 'CIN', away: 'BAL', fav: 'away', line: 1.5, offsetHours: 48 }, // future — open
  { home: 'MIA', away: 'SF', fav: 'home', line: 6, offsetHours: 96 } // future — open
];

const WEIGHT_CYCLE: Weight[] = ['L', 'M', 'H'];

// --- date helpers ------------------------------------------------------------
const NOW = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const addHours = (d: Date, n: number) => new Date(d.getTime() + n * 3_600_000);

// --- low-level idempotent upserts -------------------------------------------
async function ensureAuthUsers() {
  // Direct DB connection (superuser) to write to the auth schema, which PostgREST/GoTrue
  // won't let us touch. Idempotent: existing rows are left alone.
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('Missing DATABASE_URL (expected in .env.local)');
  const sql = postgres(dbUrl);
  try {
    for (const p of PLAYERS) {
      await sql`
        insert into auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) values (
          ${p.id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          ${p.email}, crypt(${PASSWORD}, gen_salt('bf')), now(),
          ${sql.json({ provider: 'email', providers: ['email'] })},
          ${sql.json({ display_name: p.display })}, now(), now(),
          '', '', '', '', '', '', '', ''
        )
        on conflict (id) do nothing`;
      await sql`
        insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
        select gen_random_uuid(), ${p.id}, ${p.email}, 'email',
               ${sql.json({ sub: p.id, email: p.email })}, now(), now()
        where not exists (
          select 1 from auth.identities where user_id = ${p.id} and provider = 'email'
        )`;
    }
    // Repair any pre-existing rows (e.g. an older seed.sql) so login doesn't 500.
    await sql`
      update auth.users set
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        phone_change = coalesce(phone_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        reauthentication_token = coalesce(reauthentication_token, '')
      where confirmation_token is null
         or recovery_token is null
         or email_change_token_new is null
         or email_change_token_current is null
         or email_change is null
         or phone_change is null
         or phone_change_token is null
         or reauthentication_token is null`;
  } finally {
    await sql.end();
  }
}

async function ensurePlayers(supabase: SupabaseClient): Promise<Player[]> {
  await ensureAuthUsers();
  // The auth->public.users mirror trigger is currently disabled, so upsert public.users directly.
  const { error } = await supabase.from('users').upsert(
    PLAYERS.map((p) => ({ id: p.id, display_name: p.display, role: p.role })),
    { onConflict: 'id' }
  );
  if (error) throw new Error(`upsert public.users failed: ${error.message}`);
  return PLAYERS;
}

async function ensureMemberships(supabase: SupabaseClient, players: Player[]) {
  // Enroll every demo player in the default group so group-scoped reads (picks_group_view,
  // RLS sel_picks_owner_or_started -> is_member(group_id)) can reveal their picks after kickoff.
  await supabase.from('groups').upsert({ id: GROUP_ID, name: 'Sunday Bets' }, { onConflict: 'id' });
  const { error } = await supabase.from('group_memberships').upsert(
    players.map((p) => ({
      group_id: GROUP_ID,
      user_id: p.id,
      role: p.role === 'admin' ? 'commissioner' : 'member'
    })),
    { onConflict: 'group_id,user_id' }
  );
  if (error) throw new Error(`upsert group_memberships failed: ${error.message}`);
}

async function ensureTeams(supabase: SupabaseClient) {
  const { error } = await supabase.from('teams').upsert(
    TEAMS.map((t) => ({ ...t, league: 'NFL' })),
    { onConflict: 'external_key' }
  );
  if (error) throw new Error(`upsert teams failed: ${error.message}`);
}

async function ensureSeason(supabase: SupabaseClient, year: number): Promise<number> {
  const { data, error } = await supabase
    .from('seasons')
    .upsert({ league: 'NFL', year }, { onConflict: 'league,year' })
    .select('id')
    .single();
  if (error || !data) throw new Error(`upsert season failed: ${error?.message}`);
  return data.id as number;
}

async function ensureWeek(
  supabase: SupabaseClient,
  seasonId: number,
  weekNumber: number,
  start: Date,
  end: Date
): Promise<number> {
  const { data, error } = await supabase
    .from('weeks')
    .upsert(
      { season_id: seasonId, week_number: weekNumber, start_ts: iso(start), end_ts: iso(end) },
      { onConflict: 'season_id,week_number' }
    )
    .select('id')
    .single();
  if (error || !data) throw new Error(`upsert week ${weekNumber} failed: ${error?.message}`);
  return data.id as number;
}

async function ensureGame(
  supabase: SupabaseClient,
  opts: {
    externalId: string;
    weekId: number;
    homeId: number;
    awayId: number;
    commence: Date;
    finalScores?: { home: number; away: number };
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('games')
    .upsert(
      {
        external_game_id: opts.externalId,
        week_id: opts.weekId,
        home_team_id: opts.homeId,
        away_team_id: opts.awayId,
        commence_time: iso(opts.commence),
        status: opts.finalScores ? 'final' : 'scheduled',
        final_scores: opts.finalScores ?? null
      },
      { onConflict: 'external_game_id' }
    )
    .select('id')
    .single();
  if (error || !data) throw new Error(`upsert game ${opts.externalId} failed: ${error?.message}`);
  return data.id as string;
}

async function ensureLine(
  supabase: SupabaseClient,
  gameId: string,
  spreadTeamId: number,
  spreadValue: number
): Promise<number> {
  // game_lines has only a partial unique (one active line per game), which ON CONFLICT
  // can't target — so find-or-insert the active line by hand to stay idempotent.
  const { data: existing } = await supabase
    .from('game_lines')
    .select('id')
    .eq('game_id', gameId)
    .eq('is_active_line', true)
    .limit(1)
    .maybeSingle();
  if (existing) {
    const { error: updErr } = await supabase
      .from('game_lines')
      .update({ spread_team_id: spreadTeamId, spread_value: spreadValue, source: 'fanduel' })
      .eq('id', existing.id);
    if (updErr) throw new Error(`update line for ${gameId} failed: ${updErr.message}`);
    return existing.id as number;
  }
  const { data, error } = await supabase
    .from('game_lines')
    .insert({
      game_id: gameId,
      source: 'fanduel',
      spread_team_id: spreadTeamId,
      spread_value: spreadValue,
      is_active_line: true
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insert line for ${gameId} failed: ${error?.message}`);
  return data.id as number;
}

async function ensurePick(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    gameId: string;
    pickedTeamId: number;
    weight: Weight;
    lockedAt: Date;
    lockedLineId: number;
    lockedSpreadTeamId: number;
    lockedSpreadValue: number;
  }
) {
  const { error } = await supabase.from('picks').upsert(
    {
      group_id: GROUP_ID,
      user_id: opts.userId,
      game_id: opts.gameId,
      picked_team_id: opts.pickedTeamId,
      weight: opts.weight,
      locked_at: iso(opts.lockedAt),
      locked_line_id: opts.lockedLineId,
      locked_spread_team_id: opts.lockedSpreadTeamId,
      locked_spread_value: Math.abs(opts.lockedSpreadValue),
      locked_by: opts.userId
    },
    { onConflict: 'group_id,user_id,game_id' }
  );
  if (error) throw new Error(`upsert pick failed: ${error.message}`);
}

// --- main --------------------------------------------------------------------
async function run() {
  const supabase = makeClient();
  const seasonYear = NOW.getFullYear();

  console.log('Seeding players…');
  const players = await ensurePlayers(supabase);

  console.log('Enrolling players in default group…');
  await ensureMemberships(supabase, players);

  console.log('Seeding teams…');
  await ensureTeams(supabase);
  const teamId = await getTeamsMap(supabase); // code -> id

  console.log(`Seeding season ${seasonYear} and weeks…`);
  const seasonId = await ensureSeason(supabase, seasonYear);

  // Weeks 1-3 are fully in the past; week 4 is the active window containing `now`.
  const weekIds: number[] = [];
  for (let i = 0; i < PRIOR_WEEKS.length; i++) {
    const start = addDays(NOW, -23 + i * 7);
    const end = addDays(NOW, -16 + i * 7);
    weekIds.push(await ensureWeek(supabase, seasonId, i + 1, start, end));
  }
  const activeWeekNumber = PRIOR_WEEKS.length + 1;
  const activeWeekId = await ensureWeek(
    supabase,
    seasonId,
    activeWeekNumber,
    addDays(NOW, -2),
    addDays(NOW, 5)
  );
  weekIds.push(activeWeekId);

  const gradedGameIds: string[] = [];

  // --- Prior weeks: games, lines, picks (deterministic), all graded ----------
  for (let wi = 0; wi < PRIOR_WEEKS.length; wi++) {
    const weekId = weekIds[wi];
    const weekStart = addDays(NOW, -23 + wi * 7);
    const games = PRIOR_WEEKS[wi];

    for (let gi = 0; gi < games.length; gi++) {
      const g = games[gi];
      const homeId = teamId.get(g.home)!;
      const awayId = teamId.get(g.away)!;
      const favId = g.fav === 'home' ? homeId : awayId;
      const commence = addHours(addDays(weekStart, 3), gi); // mid-week, in the past
      const gameId = await ensureGame(supabase, {
        externalId: `demo-w${wi + 1}-g${gi}`,
        weekId,
        homeId,
        awayId,
        commence,
        finalScores: { home: g.finalHome, away: g.finalAway }
      });
      const lineId = await ensureLine(supabase, gameId, favId, -Math.abs(g.line));
      gradedGameIds.push(gameId);

      for (let pi = 0; pi < players.length; pi++) {
        const allInGame = 1 + ((pi + wi) % 4); // 1..4, never the push game (g0)
        const isSkipper = pi !== 0 && pi === 1 + (wi % 5); // one non-admin skips one game/week
        const skipGame = isSkipper ? (allInGame === 4 ? 3 : 4) : -1;
        if (gi === skipGame) continue; // leave a hole -> 'missed' after grading

        const side: Fav = (pi + gi) % 2 === 0 ? 'home' : 'away';
        const weight: Weight =
          gi === allInGame ? 'A' : WEIGHT_CYCLE[(pi + gi) % WEIGHT_CYCLE.length];
        await ensurePick(supabase, {
          userId: players[pi].id,
          gameId,
          pickedTeamId: side === 'home' ? homeId : awayId,
          weight,
          lockedAt: commence,
          lockedLineId: lineId,
          lockedSpreadTeamId: favId,
          lockedSpreadValue: g.line
        });
      }
    }
  }

  // --- Active week: mixed kickoffs to exercise every picks-page state ---------
  for (let gi = 0; gi < ACTIVE_WEEK.length; gi++) {
    const g = ACTIVE_WEEK[gi];
    const homeId = teamId.get(g.home)!;
    const awayId = teamId.get(g.away)!;
    const favId = g.fav === 'home' ? homeId : awayId;
    const commence = addHours(NOW, g.offsetHours);
    const kickedOff = g.offsetHours < 0;
    const finalScores =
      g.finalHome != null && g.finalAway != null
        ? { home: g.finalHome, away: g.finalAway }
        : undefined;

    const gameId = await ensureGame(supabase, {
      externalId: `demo-w${activeWeekNumber}-g${gi}`,
      weekId: activeWeekId,
      homeId,
      awayId,
      commence,
      finalScores
    });
    const lineId = await ensureLine(supabase, gameId, favId, -Math.abs(g.line));
    if (finalScores) gradedGameIds.push(gameId);

    for (let pi = 0; pi < players.length; pi++) {
      const even = pi % 2 === 0;
      let pick: { side: Fav; weight: Weight } | null = null;

      if (gi === 0) {
        // Kicked off, everyone committed. Non-admins use their All-In here (used chip);
        // admin uses Medium so admin's All-In stays available on the open games.
        pick = { side: even ? 'home' : 'away', weight: pi === 0 ? 'M' : 'A' };
      } else if (gi === 1) {
        // Kicked off. Even players (incl. admin) skip -> 'missed'; odd players committed.
        if (!even) pick = { side: 'away', weight: WEIGHT_CYCLE[(pi - 1) % WEIGHT_CYCLE.length] };
      } else if (gi === 2) {
        // Future: a current selection that is still editable in the UI.
        pick = { side: even ? 'home' : 'away', weight: 'L' };
      }
      // gi 3 & 4: no pick -> open, pickable cards (admin still has All-In available).

      if (!pick) continue;
      await ensurePick(supabase, {
        userId: players[pi].id,
        gameId,
        pickedTeamId: pick.side === 'home' ? homeId : awayId,
        weight: pick.weight,
        lockedAt: kickedOff ? commence : NOW,
        lockedLineId: lineId,
        lockedSpreadTeamId: favId,
        lockedSpreadValue: g.line
      });
    }
  }

  // --- Grade every finalized game (prior weeks + kicked-off active games) -----
  console.log(`Grading ${gradedGameIds.length} games…`);
  for (const id of gradedGameIds) {
    const { error } = await supabase.rpc('grade_game', { p_game_id: id });
    if (error) throw new Error(`grade_game(${id}) failed: ${error.message}`);
  }

  // Grading writes settlements but the leaderboard/stats matviews (issue #191) only
  // recompute on an explicit refresh; do it once after grading so the seeded data shows.
  const { error: refreshErr } = await supabase.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error(`refresh_leaderboard_stats failed: ${refreshErr.message}`);

  // --- Admin screen data: settings + cron run log ----------------------------
  console.log('Seeding settings + cron_run_log…');
  const { error: settingsErr } = await supabase.from('settings').upsert({
    id: true,
    odds_api_monthly_cap: 500,
    odds_api_calls_used_current_month: 120,
    reset_on: iso(addDays(NOW, 9)).slice(0, 10)
  });
  if (settingsErr) throw new Error(`upsert settings failed: ${settingsErr.message}`);

  // Clear our demo cron rows then insert a representative mix (ok + failed).
  await supabase.from('cron_run_log').delete().neq('id', -1);
  const { error: cronErr } = await supabase.from('cron_run_log').insert([
    {
      job: 'sync-odds',
      started_at: iso(addHours(NOW, -2)),
      finished_at: iso(addHours(NOW, -2 + 0.01)),
      ok: true,
      summary: { games_updated: 12 }
    },
    {
      job: 'grade',
      started_at: iso(addHours(NOW, -1)),
      finished_at: iso(addHours(NOW, -1 + 0.005)),
      ok: true,
      summary: { games_graded: gradedGameIds.length }
    },
    {
      job: 'rollover-week',
      started_at: iso(addHours(NOW, -0.5)),
      finished_at: iso(addHours(NOW, -0.5 + 0.002)),
      ok: false,
      error: 'No upcoming week found to roll over into'
    }
  ]);
  if (cronErr) throw new Error(`insert cron_run_log failed: ${cronErr.message}`);

  console.log('\n✅ Demo data seeded.');
  console.log(
    `   Season ${seasonYear}: weeks 1-${activeWeekNumber} (week ${activeWeekNumber} is active).`
  );
  console.log('   Logins (password for all: "password"):');
  for (const p of players) {
    console.log(`     - ${p.email}  (${p.display}${p.role === 'admin' ? ', admin' : ''})`);
  }
}

run().catch((err) => {
  console.error('\n❌ seed-demo failed:', err);
  process.exit(1);
});

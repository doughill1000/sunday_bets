// Demo seed: builds a synthetic, DATE-ANCHORED multi-group / multi-season league in the
// LOCAL Supabase DB so every UI screen can be inspected, regardless of the real date.
//
// What it builds (all idempotent — find-or-create + upsert + deterministic PRNG):
//   • 8 players, 2 groups ("Sunday Bets", "The Spread Heads") with overlapping membership.
//   • 3 NFL seasons: the two prior years are FULLY COMPLETED (14 scoring weeks, all games
//     final) so the league honors read-model lights up — reigning champion, trophy case,
//     wooden spoon. The current year is IN PROGRESS (CUR_BULK_WEEKS deep bulk weeks + 3
//     hand-authored recent weeks, all graded, then one active week) so the picks page still
//     renders every open/locked/selected state AND the season carries enough per-team ATS
//     volume for the /league tab and the live week's pick-card ATS nuggets (issue #406) to
//     render — the nugget needs 4+ games in a home/away × fav/dog quadrant to show.
//   • Per-player archetypes (the homer, the choker, the big-game hunter, the ghost, …) so
//     the awards/badges engine has reliable holders to surface, and season "form" boosts
//     so the trophy case shows different champions across years.
//   • Full grading + a single matview refresh so leaderboards and stats are populated.
//   • A deterministic AI-style recap (ai_recaps) for every graded week of every group.
//
// Why this exists: findActiveWeek()/getActiveWeekGames() only return a week where
// start_ts <= now <= end_ts, and the honors/awards/stats screens need completed history.
// Cloning prod has all kickoffs in the past, so neither the live picks states nor a
// fresh-looking history render in the offseason. This anchors both to `new Date()`.
//
// Usage (intended on a freshly reset DB):
//   pnpm db:reset:demo      # supabase db reset --local --yes && pnpm db:seed:demo
//   pnpm db:seed:demo       # seed on top of an already-reset local DB
//
// Uses the service-role client (bypasses RLS) and a direct Postgres connection for auth.
import 'dotenv/config';
import postgres from 'postgres';
import { makeClient, getTeamsMap } from '../backfill-picks/db.ts';
import { rebuildPlayerRatings } from '../../../src/lib/server/rating/rebuild.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Players -----------------------------------------------------------------
// All 8 have fixed ids. The first 3 match supabase/seed.sql; the rest are created here.
// The GoTrue admin API (auth.admin.*) is unusable on the current local CLI (it 500s on the
// hand-seeded auth.users rows), so we create/repair auth users via a direct Postgres
// connection (DATABASE_URL) instead. Password is the same for everyone: "password".
const PASSWORD = 'password';

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
    display: 'Marcus',
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
  },
  {
    email: 'demo7@example.com',
    display: 'Nate',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000007'
  },
  {
    email: 'demo8@example.com',
    display: 'Olivia',
    role: 'player',
    id: '00000000-0000-0000-0000-000000000008'
  }
];

// Per-player archetypes drive the awards engine. `skill` is the probability a pick covers
// the spread; the other knobs steer specific badges (homer/choker/hunter/ghost).
interface Archetype {
  skill: number; // base P(pick covers)
  allInRate: number; // P(a given pick is upgraded to All-In, capped 1/week)
  skipRate: number; // P(skip a game -> graded as 'missed')
  homerTeam?: string; // always picks this team's side when it plays (-> The Homer)
  allInForce?: 'win' | 'lose'; // force All-In outcomes (-> Big Game Hunter / The Choker)
}
// Indexed parallel to PLAYERS.
const ARCHETYPES: Archetype[] = [
  { skill: 0.7, allInRate: 0.2, skipRate: 0.03 }, // Doug  — balanced, perennial contender
  { skill: 0.52, allInRate: 0.12, skipRate: 0.02, allInForce: 'win' }, // Hank — Big Game Hunter
  { skill: 0.56, allInRate: 0.15, skipRate: 0.05 }, // Charlie — streaky / contrarian-ish
  { skill: 0.58, allInRate: 0.15, skipRate: 0.32 }, // Marcus — The Ghost (skips a lot)
  { skill: 0.7, allInRate: 0.2, skipRate: 0.03, homerTeam: 'PHI' }, // Beth — The Homer (PHI)
  { skill: 0.5, allInRate: 0.3, skipRate: 0.05, allInForce: 'lose' }, // Mike — The Choker
  { skill: 0.64, allInRate: 0.2, skipRate: 0.04 }, // Nate
  { skill: 0.66, allInRate: 0.22, skipRate: 0.04 } // Olivia
];

// --- Groups ------------------------------------------------------------------
// Group A is the stable v1.7 tenancy group (seeded by migration 0213). Group B is created
// here. Doug (idx 0, admin) is in both so the signed-in admin can switch between them.
const GROUP_A_ID = '00000000-0000-4000-8000-000000000017';
const GROUP_B_ID = '00000000-0000-4000-8000-000000000018';
interface Group {
  id: string;
  name: string;
  spice: 'mild' | 'medium' | 'spicy';
  memberIdx: number[]; // indexes into PLAYERS
  commissionerIdx: number;
}
const GROUPS: Group[] = [
  {
    id: GROUP_A_ID,
    name: 'Sunday Bets',
    // Spicy on purpose: this is the featured group behind the public /demo snapshot (#460),
    // and full villain-mode Commissioner prose is the marketing hook. Keep it spicy.
    spice: 'spicy',
    memberIdx: [0, 1, 2, 3, 4, 5],
    commissionerIdx: 0
  },
  {
    id: GROUP_B_ID,
    name: 'The Spread Heads',
    spice: 'spicy',
    memberIdx: [0, 1, 3, 5, 6, 7],
    commissionerIdx: 6
  }
];

// --- Teams (external_key is unique; getTeamsMap keys by short_name + external_key) -------
// division/conference mirror supabase/src/schemas/0229_seed_team_divisions.sql so the
// league_ats_divisional module renders: that migration seeds the columns keyed by
// external_key, but it runs BEFORE this script inserts the rows, so it updates 0 rows and we
// must set them here directly (otherwise every demo team is left null -> the divisional split
// has no classifiable games).
const TEAMS: Array<{
  external_key: string;
  name: string;
  short_name: string;
  division: string;
  conference: string;
}> = [
  {
    external_key: 'PHI',
    name: 'Philadelphia Eagles',
    short_name: 'PHI',
    division: 'East',
    conference: 'NFC'
  },
  {
    external_key: 'DAL',
    name: 'Dallas Cowboys',
    short_name: 'DAL',
    division: 'East',
    conference: 'NFC'
  },
  {
    external_key: 'KC',
    name: 'Kansas City Chiefs',
    short_name: 'KC',
    division: 'West',
    conference: 'AFC'
  },
  {
    external_key: 'BUF',
    name: 'Buffalo Bills',
    short_name: 'BUF',
    division: 'East',
    conference: 'AFC'
  },
  {
    external_key: 'SF',
    name: 'San Francisco 49ers',
    short_name: 'SF',
    division: 'West',
    conference: 'NFC'
  },
  {
    external_key: 'BAL',
    name: 'Baltimore Ravens',
    short_name: 'BAL',
    division: 'North',
    conference: 'AFC'
  },
  {
    external_key: 'CIN',
    name: 'Cincinnati Bengals',
    short_name: 'CIN',
    division: 'North',
    conference: 'AFC'
  },
  {
    external_key: 'MIA',
    name: 'Miami Dolphins',
    short_name: 'MIA',
    division: 'East',
    conference: 'AFC'
  },
  {
    external_key: 'DET',
    name: 'Detroit Lions',
    short_name: 'DET',
    division: 'North',
    conference: 'NFC'
  },
  {
    external_key: 'GB',
    name: 'Green Bay Packers',
    short_name: 'GB',
    division: 'North',
    conference: 'NFC'
  },
  {
    external_key: 'MIN',
    name: 'Minnesota Vikings',
    short_name: 'MIN',
    division: 'North',
    conference: 'NFC'
  },
  {
    external_key: 'SEA',
    name: 'Seattle Seahawks',
    short_name: 'SEA',
    division: 'West',
    conference: 'NFC'
  },
  {
    external_key: 'LAR',
    name: 'Los Angeles Rams',
    short_name: 'LAR',
    division: 'West',
    conference: 'NFC'
  },
  {
    external_key: 'NYJ',
    name: 'New York Jets',
    short_name: 'NYJ',
    division: 'East',
    conference: 'AFC'
  },
  {
    external_key: 'NE',
    name: 'New England Patriots',
    short_name: 'NE',
    division: 'East',
    conference: 'AFC'
  },
  {
    external_key: 'PIT',
    name: 'Pittsburgh Steelers',
    short_name: 'PIT',
    division: 'North',
    conference: 'AFC'
  }
];

// Two-tier strength split used ONLY by the current season's bulk history below. Pairing a
// strong team against a weak one every week and favoring the strong side concentrates each
// team into two situational quadrants (a strong team is only ever home-favorite / away-
// favorite; a weak team only ever home-underdog / away-underdog), so across a dozen weeks a
// team clears the pick-card nugget's MIN_NUGGET_SAMPLE (4) in the quadrants it actually
// appears in. The live week's open games (BUF/MIA/BAL as favorites, PHI/CIN/SF as dogs) are
// drawn from these tiers so their cards reliably show a nugget.
const STRONG_TEAMS = ['BUF', 'MIA', 'BAL', 'KC', 'PIT', 'DET', 'SEA', 'DAL'];
const WEAK_TEAMS = ['PHI', 'CIN', 'SF', 'GB', 'MIN', 'LAR', 'NYJ', 'NE'];

type Fav = 'home' | 'away';
type Side = 'home' | 'away';
type Weight = 'L' | 'M' | 'H' | 'A';
const WEIGHT_CYCLE: Weight[] = ['L', 'M', 'H'];

// Spread values cycled through generated games.
const LINES = [1.5, 2.5, 3, 3.5, 4, 6, 6.5, 7, 9, 10];

// Completed-season geometry.
const COMPLETED_WEEKS = 14;
const GAMES_PER_WEEK = 4;

// How many fully-graded "bulk" weeks precede the hand-authored recent weeks in the CURRENT
// (in-progress) season. All 8 STRONG_TEAMS play all 8 WEAK_TEAMS each week (8 games), so a
// dozen weeks gives every team ~6 home and ~6 away appearances in its tier's role -- enough
// current-season depth for the /league tab and, crucially, for the pick-card ATS nugget to
// clear its 4-game quadrant floor on the live week's cards.
const CUR_BULK_WEEKS = 12;

// Tracks which (group, player, week) already spent its single All-In.
const allInUsed = new Set<string>();

// --- date helpers ------------------------------------------------------------
const NOW = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const addHours = (d: Date, n: number) => new Date(d.getTime() + n * 3_600_000);
const otherSide = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// A kickoff time whose America/New_York slot feeds league_ats_primetime (#425, #443): game 0 →
// TNF (Thu night), 1 → SAT (Sat night), 2 → SNF (Sun night), 3 → MNF (Mon night), the rest →
// a Sunday-afternoon 'day' game. Built from a UTC weekday+hour rather than an ET wall-clock so
// it is DST-robust: a 02:00-UTC kickoff on the day AFTER the target ET day converts to that ET
// *evening* (hour >= 18, the view's night test) under both EDT and EST, while 18:00 UTC Sunday
// is ~1-2pm ET (a day game). The minute is set from `i` so a week's kickoffs stay distinct.
function slotKickoff(weekStart: Date, i: number): Date {
  // i -> the UTC day-of-week whose 02:00 lands on the target ET night (Fri→Thu, Sun→Sat,
  // Mon→Sun, Tue→Mon). Absent i (day games) land on Sunday afternoon UTC.
  const NIGHT: Record<number, number> = { 0: 5, 1: 0, 2: 1, 3: 2 };
  const isNight = i in NIGHT;
  const targetDow = isNight ? NIGHT[i] : 0;
  const utcHour = isNight ? 2 : 18;
  const d = new Date(weekStart);
  d.setUTCHours(utcHour, i, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((targetDow - d.getUTCDay() + 7) % 7));
  return d;
}

// Deterministic PRNG (mulberry32) so re-runs produce identical data (idempotent upserts).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Prior, fully-graded weeks of the CURRENT (in-progress) season -----------
// Game 0 of each week is engineered to PUSH (margin 0) so the 'push' outcome appears.
interface PriorGame {
  home: string;
  away: string;
  fav: Fav;
  line: number;
  finalHome: number;
  finalAway: number;
}
const PRIOR_WEEKS: PriorGame[][] = [
  [
    { home: 'PHI', away: 'DAL', fav: 'home', line: 3, finalHome: 24, finalAway: 21 }, // push
    { home: 'KC', away: 'BUF', fav: 'home', line: 6.5, finalHome: 27, finalAway: 17 },
    { home: 'SF', away: 'BAL', fav: 'away', line: 2.5, finalHome: 20, finalAway: 27 },
    { home: 'CIN', away: 'MIA', fav: 'home', line: 1.5, finalHome: 21, finalAway: 20 },
    { home: 'DET', away: 'GB', fav: 'home', line: 7, finalHome: 24, finalAway: 21 }
  ],
  [
    { home: 'MIN', away: 'SEA', fav: 'away', line: 4, finalHome: 20, finalAway: 24 }, // push
    { home: 'LAR', away: 'NYJ', fav: 'home', line: 3, finalHome: 30, finalAway: 10 },
    { home: 'NE', away: 'PIT', fav: 'home', line: 10, finalHome: 17, finalAway: 14 },
    { home: 'PHI', away: 'KC', fav: 'away', line: 6, finalHome: 14, finalAway: 28 },
    { home: 'DAL', away: 'BUF', fav: 'home', line: 2.5, finalHome: 27, finalAway: 20 }
  ],
  [
    { home: 'SF', away: 'CIN', fav: 'home', line: 7, finalHome: 28, finalAway: 21 }, // push
    { home: 'BAL', away: 'MIA', fav: 'away', line: 3.5, finalHome: 24, finalAway: 20 },
    { home: 'DET', away: 'MIN', fav: 'home', line: 1, finalHome: 13, finalAway: 20 },
    { home: 'GB', away: 'SEA', fav: 'home', line: 4.5, finalHome: 31, finalAway: 24 },
    { home: 'LAR', away: 'NE', fav: 'away', line: 9, finalHome: 35, finalAway: 10 }
  ]
];

// The active week. g0/g1 have already kicked off (negative offset) and get graded; g2-g4
// are in the future and stay open.
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

// --- low-level idempotent upserts -------------------------------------------
async function ensureAuthUsers() {
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

async function ensureGroupsAndMemberships(supabase: SupabaseClient) {
  for (const g of GROUPS) {
    const { error: gErr } = await supabase
      .from('groups')
      .upsert({ id: g.id, name: g.name }, { onConflict: 'id' });
    if (gErr) throw new Error(`upsert group ${g.name} failed: ${gErr.message}`);

    const { error: cfgErr } = await supabase
      .from('group_config')
      .upsert(
        { group_id: g.id, spice: g.spice, ai_recaps_enabled: true },
        { onConflict: 'group_id' }
      );
    if (cfgErr) throw new Error(`upsert group_config ${g.name} failed: ${cfgErr.message}`);

    const { error: mErr } = await supabase.from('group_memberships').upsert(
      g.memberIdx.map((idx) => ({
        group_id: g.id,
        user_id: PLAYERS[idx].id,
        role: idx === g.commissionerIdx ? 'commissioner' : 'member',
        status: 'active'
      })),
      { onConflict: 'group_id,user_id' }
    );
    if (mErr) throw new Error(`upsert memberships ${g.name} failed: ${mErr.message}`);
  }
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

// A pick row ready for bulk upsert into public.picks.
interface PickRow {
  group_id: string;
  user_id: string;
  game_id: string;
  picked_team_id: number;
  weight: Weight;
  locked_at: string;
  locked_line_id: number;
  locked_spread_team_id: number;
  locked_spread_value: number;
  locked_by: string;
}

async function bulkUpsertPicks(supabase: SupabaseClient, rows: PickRow[]) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from('picks')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'group_id,user_id,game_id' });
    if (error) throw new Error(`bulk upsert picks failed: ${error.message}`);
  }
}

async function gradeGames(supabase: SupabaseClient, gameIds: string[]) {
  for (const id of gameIds) {
    const { error } = await supabase.rpc('grade_game', { p_game_id: id });
    if (error) throw new Error(`grade_game(${id}) failed: ${error.message}`);
  }
}

// --- spread / outcome engineering -------------------------------------------
// Given the favorite side, the spread, and whether this game should push, produce a final
// score plus the side that COVERS the spread (or 'push'). Scores are always non-negative.
function makeFinal(
  favIsHome: boolean,
  line: number,
  isPush: boolean,
  rng: () => number
): { home: number; away: number; coveringSide: Side | 'push' } {
  let favMargin: number; // favorite's score minus underdog's score
  let covering: 'fav' | 'dog' | 'push';
  if (isPush) {
    favMargin = Math.round(line); // integer line guarantees an exact push
    covering = 'push';
  } else if (rng() < 0.5) {
    favMargin = Math.ceil(line) + 1 + Math.floor(rng() * 6);
    covering = 'fav';
  } else {
    favMargin = Math.floor(line) - 1 - Math.floor(rng() * 6); // may go negative (dog wins outright)
    covering = 'dog';
  }
  const baseLow = 17 + Math.floor(rng() * 8);
  const favScore = baseLow + Math.max(0, favMargin);
  const dogScore = baseLow + Math.max(0, -favMargin);
  const home = favIsHome ? favScore : dogScore;
  const away = favIsHome ? dogScore : favScore;
  const coveringSide: Side | 'push' =
    covering === 'push'
      ? 'push'
      : covering === 'fav'
        ? favIsHome
          ? 'home'
          : 'away'
        : favIsHome
          ? 'away'
          : 'home';
  return { home, away, coveringSide };
}

// Derive the covering side of an already-scored game (used for the current season's
// hand-authored prior weeks).
function coveringSideOf(g: PriorGame): Side | 'push' {
  const favIsHome = g.fav === 'home';
  const favMargin = favIsHome ? g.finalHome - g.finalAway : g.finalAway - g.finalHome;
  if (favMargin > g.line) return favIsHome ? 'home' : 'away';
  if (favMargin < g.line) return favIsHome ? 'away' : 'home';
  return 'push';
}

// Season "form" boost so the trophy case shows different champions year over year.
function seasonBoost(seasonIdx: number, playerIdx: number): number {
  // Oldest completed season: Charlie tops group A, Olivia tops group B.
  if (seasonIdx === 0 && playerIdx === 2) return 0.25; // Charlie
  if (seasonIdx === 0 && playerIdx === 7) return 0.28; // Olivia
  // Most-recent completed season: Doug tops both groups.
  if (seasonIdx === 1 && playerIdx === 0) return 0.22; // Doug
  return 0;
}

// Decide one player's pick on one game. Returns null = no pick (-> 'missed' on grading).
function decidePick(opts: {
  playerIdx: number;
  seasonIdx: number;
  gameIdx: number;
  homeCode: string;
  awayCode: string;
  favIsHome: boolean;
  coveringSide: Side | 'push';
  rng: () => number;
  allInUsedThisWeek: boolean;
  forcePerfect: boolean; // force a covering, non-All-In pick (engineered Perfect Week)
}): { side: Side; weight: Weight; usedAllIn: boolean } | null {
  const arche = ARCHETYPES[opts.playerIdx];

  if (!opts.forcePerfect && opts.rng() < arche.skipRate) return null;

  // Side
  let side: Side;
  if (arche.homerTeam && (opts.homeCode === arche.homerTeam || opts.awayCode === arche.homerTeam)) {
    side = opts.homeCode === arche.homerTeam ? 'home' : 'away';
  } else if (opts.coveringSide === 'push') {
    side = opts.favIsHome ? 'home' : 'away';
  } else {
    const skill = clamp(arche.skill + seasonBoost(opts.seasonIdx, opts.playerIdx), 0.05, 0.95);
    side = opts.rng() < skill ? opts.coveringSide : otherSide(opts.coveringSide);
  }

  // Weight (one All-In per player per week, unless this is the engineered Perfect Week).
  let weight: Weight = WEIGHT_CYCLE[(opts.playerIdx + opts.gameIdx) % WEIGHT_CYCLE.length];
  let usedAllIn = false;
  if (!opts.forcePerfect && !opts.allInUsedThisWeek && opts.rng() < arche.allInRate) {
    weight = 'A';
    usedAllIn = true;
    if (opts.coveringSide !== 'push') {
      if (arche.allInForce === 'win') side = opts.coveringSide;
      else if (arche.allInForce === 'lose') side = otherSide(opts.coveringSide);
    }
  }

  if (opts.forcePerfect && opts.coveringSide !== 'push') side = opts.coveringSide;
  return { side, weight, usedAllIn };
}

// --- recap prose (deterministic, AI-styled) ---------------------------------
interface FactsPlayer {
  user_id: string;
  display_name: string;
}
interface RecapFacts {
  group_id: string;
  group_name: string;
  season_year: number;
  week_number: number;
  is_final_week: boolean;
  spice: string;
  opted_out_user_ids: string[];
  week_leader: (FactsPlayer & { points: number }) | null;
  week_laggard: (FactsPlayer & { points: number }) | null;
  perfect_weeks: FactsPlayer[];
  allin_hero: FactsPlayer | null;
  allin_zero: FactsPlayer | null;
  contrarian_hit: (FactsPlayer & { consensus_pct: number }) | null;
  standings: (FactsPlayer & { rank: number; total_points: number })[];
  badge_changes: { badge_label: string; new_holders: string[]; prev_holders: string[] }[];
}

function renderRecapProse(facts: RecapFacts, spice: string): string {
  const leader = facts.week_leader;
  const open =
    spice === 'spicy'
      ? `Week ${facts.week_number} is in the books for ${facts.group_name}, and the spread gods played favorites.`
      : `Week ${facts.week_number} wrapped up in ${facts.group_name}.`;
  const lines: string[] = [open];

  if (leader) {
    lines.push(
      spice === 'spicy'
        ? `${leader.display_name} torched the slate for ${leader.points} points — the rest of you were just spectators.`
        : `${leader.display_name} paced the group with ${leader.points} points.`
    );
  }
  if (facts.perfect_weeks.length > 0) {
    const names = facts.perfect_weeks.map((p) => p.display_name).join(' and ');
    lines.push(`${names} ran the table — a flawless, perfect week.`);
  }
  if (facts.allin_hero) {
    lines.push(`${facts.allin_hero.display_name} went All-In and cashed it.`);
  }
  if (facts.allin_zero) {
    lines.push(
      spice === 'spicy'
        ? `${facts.allin_zero.display_name}, meanwhile, shoved the chips in and watched them vanish.`
        : `${facts.allin_zero.display_name}'s All-In didn't land.`
    );
  }
  if (facts.contrarian_hit) {
    lines.push(
      `${facts.contrarian_hit.display_name} bucked the room — only ${facts.contrarian_hit.consensus_pct}% were on that side — and was right.`
    );
  }
  if (facts.week_laggard) {
    lines.push(
      spice === 'spicy'
        ? `Someone has to bring up the rear, and this week that was ${facts.week_laggard.display_name}.`
        : `${facts.week_laggard.display_name} had a week to forget.`
    );
  }
  if (facts.is_final_week) {
    const champ = facts.standings.find((s) => s.rank === 1);
    lines.push(
      champ
        ? `That wraps the regular season — ${champ.display_name} takes the crown with ${champ.total_points} points. Final standings are set.`
        : `That wraps the regular season. Final standings are set.`
    );
  } else if (facts.standings.length > 0) {
    const top = facts.standings[0];
    lines.push(`${top.display_name} sits atop the standings for now.`);
  }
  return lines.join(' ');
}

// Build recap facts for one (group, season, week) from the freshly-refreshed matviews.
async function buildFacts(
  supabase: SupabaseClient,
  group: Group,
  seasonYear: number,
  weekNumber: number,
  weekId: number,
  isFinalWeek: boolean
): Promise<RecapFacts> {
  const { data: trend } = await supabase
    .from('stats_season_trend')
    .select('user_id, display_name, week_points, week_wins, week_losses, week_pushes, week_missed')
    .eq('group_id', group.id)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber);

  const sorted = [...(trend ?? [])].sort((a, b) => b.week_points - a.week_points);
  const weekLeader = sorted[0]
    ? {
        user_id: sorted[0].user_id,
        display_name: sorted[0].display_name,
        points: sorted[0].week_points
      }
    : null;
  const laggardRaw = sorted[sorted.length - 1];
  const weekLaggard =
    laggardRaw && laggardRaw !== sorted[0]
      ? {
          user_id: laggardRaw.user_id,
          display_name: laggardRaw.display_name,
          points: laggardRaw.week_points
        }
      : null;
  const perfectWeeks = (trend ?? [])
    .filter(
      (r) => r.week_wins > 0 && r.week_losses === 0 && r.week_pushes === 0 && r.week_missed === 0
    )
    .map((r) => ({ user_id: r.user_id, display_name: r.display_name }));

  const { data: totals } = await supabase
    .from('leaderboard_season_totals')
    .select('user_id, display_name, rank, total_points')
    .eq('group_id', group.id)
    .eq('season_year', seasonYear)
    .order('rank', { ascending: true })
    .limit(5);
  const standings = (totals ?? []).map((t) => ({
    user_id: t.user_id,
    display_name: t.display_name,
    rank: t.rank,
    total_points: t.total_points
  }));

  // All-in hero / zero from this week's games.
  const { data: weekGames } = await supabase.from('games').select('id').eq('week_id', weekId);
  const gameIds = (weekGames ?? []).map((g) => g.id);
  let allinHero: FactsPlayer | null = null;
  let allinZero: FactsPlayer | null = null;
  if (gameIds.length > 0) {
    const { data: allin } = await supabase
      .from('pick_settlement')
      .select('user_id, outcome, picks!inner(group_id, weight)')
      .in('game_id', gameIds)
      .eq('picks.weight', 'A')
      .eq('picks.group_id', group.id);
    const nameOf = new Map((trend ?? []).map((t) => [t.user_id, t.display_name]));
    const win = (allin ?? []).find((r) => r.outcome === 'win');
    const loss = (allin ?? []).find((r) => r.outcome === 'loss');
    if (win)
      allinHero = { user_id: win.user_id, display_name: nameOf.get(win.user_id) ?? win.user_id };
    if (loss)
      allinZero = { user_id: loss.user_id, display_name: nameOf.get(loss.user_id) ?? loss.user_id };
  }

  const { data: cons } = await supabase
    .from('group_pick_consensus')
    .select('user_id, display_name, consensus_pct')
    .eq('group_id', group.id)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber)
    .eq('is_minority', true)
    .eq('graded_outcome', 'win')
    .order('consensus_pct', { ascending: true })
    .limit(1);
  const contRow = (cons ?? [])[0];
  const contrarianHit = contRow
    ? {
        user_id: contRow.user_id,
        display_name: contRow.display_name,
        consensus_pct: Number(contRow.consensus_pct)
      }
    : null;

  return {
    group_id: group.id,
    group_name: group.name,
    season_year: seasonYear,
    week_number: weekNumber,
    is_final_week: isFinalWeek,
    spice: group.spice,
    opted_out_user_ids: [],
    week_leader: weekLeader,
    week_laggard: weekLaggard,
    perfect_weeks: perfectWeeks,
    allin_hero: allinHero,
    allin_zero: allinZero,
    contrarian_hit: contrarianHit,
    standings,
    badge_changes: []
  };
}

async function upsertRecap(supabase: SupabaseClient, facts: RecapFacts) {
  const prose = renderRecapProse(facts, facts.spice);
  const { error } = await supabase.from('ai_recaps').upsert(
    {
      group_id: facts.group_id,
      season_year: facts.season_year,
      week_number: facts.week_number,
      prose,
      facts,
      // Demo prose is generated locally (no live AI call), but presented as real commentary
      // so the recap UI renders cleanly rather than showing the "unavailable" fallback note.
      is_fallback: false,
      model: 'openai/gpt-5.4',
      prompt_tokens: 540,
      completion_tokens: 300
    },
    { onConflict: 'group_id,season_year,week_number', ignoreDuplicates: false }
  );
  if (error) throw new Error(`upsert ai_recaps failed: ${error.message}`);
}

// --- main --------------------------------------------------------------------
async function run() {
  const supabase = makeClient();
  const currentYear = NOW.getFullYear();

  console.log('Seeding players…');
  await ensurePlayers(supabase);

  console.log('Seeding groups, configs, memberships…');
  await ensureGroupsAndMemberships(supabase);

  console.log('Seeding teams…');
  await ensureTeams(supabase);
  const teamId = await getTeamsMap(supabase); // code -> id

  // Track every graded week per group so we can write a recap for each afterward.
  // gradedWeeks[groupId] = [{ seasonYear, weekNumber, weekId, isFinalWeek }]
  const gradedWeeks: Record<
    string,
    Array<{ seasonYear: number; weekNumber: number; weekId: number; isFinalWeek: boolean }>
  > = {};
  for (const g of GROUPS) gradedWeeks[g.id] = [];

  // ===========================================================================
  // 1) Two fully-completed prior seasons (trophy case + reigning champ + spoon)
  // ===========================================================================
  const completedYears = [currentYear - 2, currentYear - 1];
  for (let si = 0; si < completedYears.length; si++) {
    const seasonYear = completedYears[si];
    console.log(`Seeding completed season ${seasonYear} (${COMPLETED_WEEKS} weeks)…`);
    const seasonId = await ensureSeason(supabase, seasonYear);
    const rng = mulberry32(0x5eed * (si + 1) + seasonYear);

    const pickRows: PickRow[] = [];
    const gameIds: string[] = [];

    // One engineered Perfect Week per season for a chosen player.
    const perfect = si === 0 ? { playerIdx: 4, week: 9 } : { playerIdx: 0, week: 6 };

    for (let wk = 1; wk <= COMPLETED_WEEKS; wk++) {
      // Season runs Sep–Dec of its (past) year.
      const start = new Date(seasonYear, 8, 7 + (wk - 1) * 7, 13, 0, 0);
      const end = addDays(start, 6);
      const weekId = await ensureWeek(supabase, seasonId, wk, start, end);

      for (let gi = 0; gi < GAMES_PER_WEEK; gi++) {
        // Rotate matchups through the team list; keep PHI in play often (for The Homer).
        const offset = (wk * 3 + gi * 2) % TEAMS.length;
        let homeCode = TEAMS[offset].short_name;
        let awayCode = TEAMS[(offset + 1) % TEAMS.length].short_name;
        if (gi === 0 && homeCode !== 'PHI' && awayCode !== 'PHI' && wk % 2 === 0) {
          homeCode = 'PHI';
          awayCode =
            TEAMS[(offset + 1) % TEAMS.length].short_name === 'PHI'
              ? TEAMS[(offset + 2) % TEAMS.length].short_name
              : awayCode;
        }
        if (homeCode === awayCode) awayCode = TEAMS[(offset + 2) % TEAMS.length].short_name;

        const favIsHome = (wk + gi) % 2 === 0;
        let line = LINES[(si * 7 + wk * 3 + gi) % LINES.length];
        const isPush = gi === 0 && wk % 5 === 0; // a few guaranteed pushes
        if (isPush) line = Math.max(1, Math.round(line));

        const { home, away, coveringSide } = makeFinal(favIsHome, line, isPush, rng);
        const homeId = teamId.get(homeCode)!;
        const awayId = teamId.get(awayCode)!;
        const favId = favIsHome ? homeId : awayId;
        const commence = addHours(start, 12 + gi * 3);

        const gameId = await ensureGame(supabase, {
          externalId: `demo-s${seasonYear}-w${wk}-g${gi}`,
          weekId,
          homeId,
          awayId,
          commence,
          finalScores: { home, away }
        });
        const lineId = await ensureLine(supabase, gameId, favId, -Math.abs(line));
        gameIds.push(gameId);

        for (const group of GROUPS) {
          for (const playerIdx of group.memberIdx) {
            const allInKey = `${group.id}:${playerIdx}:${seasonYear}:${wk}`;
            const allInUsedThisWeek = allInUsed.has(allInKey);
            const forcePerfect =
              playerIdx === perfect.playerIdx &&
              wk === perfect.week &&
              group.memberIdx.includes(playerIdx);
            const decided = decidePick({
              playerIdx,
              seasonIdx: si,
              gameIdx: gi,
              homeCode,
              awayCode,
              favIsHome,
              coveringSide,
              rng,
              allInUsedThisWeek,
              forcePerfect
            });
            if (!decided) continue;
            if (decided.usedAllIn) allInUsed.add(allInKey);
            pickRows.push({
              group_id: group.id,
              user_id: PLAYERS[playerIdx].id,
              game_id: gameId,
              picked_team_id: decided.side === 'home' ? homeId : awayId,
              weight: decided.weight,
              locked_at: iso(commence),
              locked_line_id: lineId,
              locked_spread_team_id: favId,
              locked_spread_value: Math.abs(line),
              locked_by: PLAYERS[playerIdx].id
            });
          }
        }
      }

      for (const group of GROUPS) {
        gradedWeeks[group.id].push({
          seasonYear,
          weekNumber: wk,
          weekId,
          isFinalWeek: wk === COMPLETED_WEEKS
        });
      }
    }

    console.log(`  ${pickRows.length} picks, grading ${gameIds.length} games…`);
    await bulkUpsertPicks(supabase, pickRows);
    await gradeGames(supabase, gameIds);
  }

  // ===========================================================================
  // 2) Current, in-progress season: prior graded weeks + live active week
  // ===========================================================================
  console.log(`Seeding current season ${currentYear} (in progress)…`);
  const curSeasonId = await ensureSeason(supabase, currentYear);
  const curRng = mulberry32(0xc0ffee + currentYear);
  const groupAPlayers = PLAYERS.slice(0, 6);
  const groupBOnly = GROUPS[1]; // for layering group B picks on the same games

  const curPickRows: PickRow[] = [];
  const curGradedGameIds: string[] = [];

  // Weeks 1..CUR_BULK_WEEKS: bulk-generated, fully graded depth so the CURRENT season carries
  // enough per-team ATS volume for the /league tab AND the pick-card nugget (issue #406) to
  // render on the live week -- the three hand-authored recent weeks alone are far too thin
  // (a team needs 4 games in one home/away × fav/dog quadrant before its nugget shows). Every
  // strong team plays a weak team each week and the strong side is favored, so games+lines+
  // finals feed league_ats_base while archetype picks + grading keep the leaderboard honest.
  // These weeks precede the recent hand-authored weeks in both week number and calendar date.
  for (let bw = 1; bw <= CUR_BULK_WEEKS; bw++) {
    const start = addDays(NOW, -23 - (CUR_BULK_WEEKS - bw + 1) * 7);
    const end = addDays(start, 6);
    const weekId = await ensureWeek(supabase, curSeasonId, bw, start, end);

    for (let i = 0; i < STRONG_TEAMS.length; i++) {
      const strongCode = STRONG_TEAMS[i];
      const weakCode = WEAK_TEAMS[(i + bw) % WEAK_TEAMS.length];
      // Alternate which tier is home so each team lands ~half its games home, ~half away.
      const strongIsHome = (i + bw) % 2 === 0;
      const homeCode = strongIsHome ? strongCode : weakCode;
      const awayCode = strongIsHome ? weakCode : strongCode;
      const favIsHome = strongIsHome; // the stronger side is always favored
      const line = LINES[(bw * 2 + i) % LINES.length];
      const { home, away, coveringSide } = makeFinal(favIsHome, line, false, curRng);
      const homeId = teamId.get(homeCode)!;
      const awayId = teamId.get(awayCode)!;
      const favId = favIsHome ? homeId : awayId;
      // Spread kickoffs across the primetime slots (TNF/SNF/MNF/day) so /league's primetime
      // module has data; the exact time stays in this week's past window either way.
      const commence = slotKickoff(start, i);

      const gameId = await ensureGame(supabase, {
        externalId: `demo-cur-bw${bw}-g${i}`,
        weekId,
        homeId,
        awayId,
        commence,
        finalScores: { home, away }
      });
      const lineId = await ensureLine(supabase, gameId, favId, -Math.abs(line));
      curGradedGameIds.push(gameId);

      for (const group of GROUPS) {
        for (const playerIdx of group.memberIdx) {
          const allInKey = `${group.id}:${playerIdx}:curbw${bw}`;
          const decided = decidePick({
            playerIdx,
            seasonIdx: 1,
            gameIdx: i,
            homeCode,
            awayCode,
            favIsHome,
            coveringSide,
            rng: curRng,
            allInUsedThisWeek: allInUsed.has(allInKey),
            forcePerfect: false
          });
          if (!decided) continue;
          if (decided.usedAllIn) allInUsed.add(allInKey);
          curPickRows.push({
            group_id: group.id,
            user_id: PLAYERS[playerIdx].id,
            game_id: gameId,
            picked_team_id: decided.side === 'home' ? homeId : awayId,
            weight: decided.weight,
            locked_at: iso(commence),
            locked_line_id: lineId,
            locked_spread_team_id: favId,
            locked_spread_value: Math.abs(line),
            locked_by: PLAYERS[playerIdx].id
          });
        }
      }
    }

    for (const group of GROUPS) {
      gradedWeeks[group.id].push({
        seasonYear: currentYear,
        weekNumber: bw,
        weekId,
        isFinalWeek: false
      });
    }
  }

  // Recent weeks (CUR_BULK_WEEKS+1 .. +3): hand-authored, fully graded. Group A uses the legacy
  // deterministic pattern (preserves push/missed coverage); group B is layered via archetypes.
  const priorWeekIds: number[] = [];
  for (let wi = 0; wi < PRIOR_WEEKS.length; wi++) {
    const start = addDays(NOW, -23 + wi * 7);
    const end = addDays(NOW, -16 + wi * 7);
    const weekId = await ensureWeek(supabase, curSeasonId, CUR_BULK_WEEKS + wi + 1, start, end);
    priorWeekIds.push(weekId);
    const games = PRIOR_WEEKS[wi];

    for (let gi = 0; gi < games.length; gi++) {
      const g = games[gi];
      const homeId = teamId.get(g.home)!;
      const awayId = teamId.get(g.away)!;
      const favId = g.fav === 'home' ? homeId : awayId;
      const commence = addHours(addDays(start, 3), gi);
      const gameId = await ensureGame(supabase, {
        externalId: `demo-w${wi + 1}-g${gi}`,
        weekId,
        homeId,
        awayId,
        commence,
        finalScores: { home: g.finalHome, away: g.finalAway }
      });
      const lineId = await ensureLine(supabase, gameId, favId, -Math.abs(g.line));
      curGradedGameIds.push(gameId);

      // --- Group A: legacy deterministic pattern (unchanged behavior) ---
      for (let pi = 0; pi < groupAPlayers.length; pi++) {
        const allInGame = 1 + ((pi + wi) % 4); // 1..4, never the push game (g0)
        const isSkipper = pi !== 0 && pi === 1 + (wi % 5);
        const skipGame = isSkipper ? (allInGame === 4 ? 3 : 4) : -1;
        if (gi === skipGame) continue;
        const side: Side = (pi + gi) % 2 === 0 ? 'home' : 'away';
        const weight: Weight =
          gi === allInGame ? 'A' : WEIGHT_CYCLE[(pi + gi) % WEIGHT_CYCLE.length];
        curPickRows.push({
          group_id: GROUP_A_ID,
          user_id: groupAPlayers[pi].id,
          game_id: gameId,
          picked_team_id: side === 'home' ? homeId : awayId,
          weight,
          locked_at: iso(commence),
          locked_line_id: lineId,
          locked_spread_team_id: favId,
          locked_spread_value: g.line,
          locked_by: groupAPlayers[pi].id
        });
      }

      // --- Group B: archetype-driven picks on the same games ---
      const coveringSide = coveringSideOf(g);
      for (const playerIdx of groupBOnly.memberIdx) {
        const allInKey = `${GROUP_B_ID}:${playerIdx}:cur${wi}`;
        const decided = decidePick({
          playerIdx,
          seasonIdx: 1,
          gameIdx: gi,
          homeCode: g.home,
          awayCode: g.away,
          favIsHome: g.fav === 'home',
          coveringSide,
          rng: curRng,
          allInUsedThisWeek: allInUsed.has(allInKey),
          forcePerfect: false
        });
        if (!decided) continue;
        if (decided.usedAllIn) allInUsed.add(allInKey);
        curPickRows.push({
          group_id: GROUP_B_ID,
          user_id: PLAYERS[playerIdx].id,
          game_id: gameId,
          picked_team_id: decided.side === 'home' ? homeId : awayId,
          weight: decided.weight,
          locked_at: iso(commence),
          locked_line_id: lineId,
          locked_spread_team_id: favId,
          locked_spread_value: g.line,
          locked_by: PLAYERS[playerIdx].id
        });
      }
    }
  }

  // The active week (the season's last, mixed kickoffs) exercises every picks-page state for
  // group A; the live open games draw on the strong/weak tiers so their cards show ATS nuggets.
  const activeWeekNumber = CUR_BULK_WEEKS + PRIOR_WEEKS.length + 1;
  const activeWeekId = await ensureWeek(
    supabase,
    curSeasonId,
    activeWeekNumber,
    addDays(NOW, -2),
    addDays(NOW, 5)
  );
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
    if (finalScores) curGradedGameIds.push(gameId);

    // Group A: the carefully tuned active-week states.
    for (let pi = 0; pi < groupAPlayers.length; pi++) {
      const even = pi % 2 === 0;
      let pick: { side: Fav; weight: Weight } | null = null;
      if (gi === 0) {
        pick = { side: even ? 'home' : 'away', weight: pi === 0 ? 'M' : 'A' };
      } else if (gi === 1) {
        if (!even) pick = { side: 'away', weight: WEIGHT_CYCLE[(pi - 1) % WEIGHT_CYCLE.length] };
      } else if (gi === 2) {
        pick = { side: even ? 'home' : 'away', weight: 'L' };
      }
      if (!pick) continue;
      curPickRows.push({
        group_id: GROUP_A_ID,
        user_id: groupAPlayers[pi].id,
        game_id: gameId,
        picked_team_id: pick.side === 'home' ? homeId : awayId,
        weight: pick.weight,
        locked_at: kickedOff ? iso(commence) : iso(NOW),
        locked_line_id: lineId,
        locked_spread_team_id: favId,
        locked_spread_value: g.line,
        locked_by: groupAPlayers[pi].id
      });
    }

    // Group B: commit to the kicked-off games (g0/g1) so it has active-week graded data too.
    if (finalScores) {
      const cover: Side | 'push' = (
        (g.fav === 'home' ? g.finalHome! - g.finalAway! : g.finalAway! - g.finalHome!) > g.line
          ? g.fav === 'home'
            ? 'home'
            : 'away'
          : g.fav === 'home'
            ? 'away'
            : 'home'
      ) as Side;
      for (const playerIdx of groupBOnly.memberIdx) {
        const decided = decidePick({
          playerIdx,
          seasonIdx: 1,
          gameIdx: gi,
          homeCode: g.home,
          awayCode: g.away,
          favIsHome: g.fav === 'home',
          coveringSide: cover,
          rng: curRng,
          allInUsedThisWeek: allInUsed.has(`${GROUP_B_ID}:${playerIdx}:cur3`),
          forcePerfect: false
        });
        if (!decided) continue;
        if (decided.usedAllIn) allInUsed.add(`${GROUP_B_ID}:${playerIdx}:cur3`);
        curPickRows.push({
          group_id: GROUP_B_ID,
          user_id: PLAYERS[playerIdx].id,
          game_id: gameId,
          picked_team_id: decided.side === 'home' ? homeId : awayId,
          weight: decided.weight,
          locked_at: iso(commence),
          locked_line_id: lineId,
          locked_spread_team_id: favId,
          locked_spread_value: g.line,
          locked_by: PLAYERS[playerIdx].id
        });
      }
    }
  }

  console.log(`  ${curPickRows.length} picks, grading ${curGradedGameIds.length} games…`);
  await bulkUpsertPicks(supabase, curPickRows);
  await gradeGames(supabase, curGradedGameIds);

  // The current season's hand-authored recent weeks are recap-eligible for both groups (the
  // bulk weeks above already pushed their own recap entries as they were generated).
  for (const group of GROUPS) {
    for (let wi = 0; wi < PRIOR_WEEKS.length; wi++) {
      gradedWeeks[group.id].push({
        seasonYear: currentYear,
        weekNumber: CUR_BULK_WEEKS + wi + 1,
        weekId: priorWeekIds[wi],
        isFinalWeek: false
      });
    }
  }

  // ===========================================================================
  // 3) Refresh matviews, then write a recap for every graded week
  // ===========================================================================
  console.log('Refreshing leaderboard/stats matviews…');
  const { error: refreshErr } = await supabase.rpc('refresh_leaderboard_stats');
  if (refreshErr) throw new Error(`refresh_leaderboard_stats failed: ${refreshErr.message}`);

  // Demo seed grades games via the raw `grade_game` RPC (above), bypassing the TS grading.ts
  // caller that normally rebuilds player_ratings after a live grade — so without this the demo's
  // credibility rating always shows every player as Unrated (issue #619, ADR-0032 §8 "the rebuild
  // must run on every settlement-writing path"). Best-effort like every other rebuildPlayerRatings
  // call: a failure here logs and leaves the table empty rather than aborting the whole seed.
  console.log('Rebuilding player_ratings…');
  await rebuildPlayerRatings(supabase, {
    onError: (err) => console.error('rebuildPlayerRatings failed during demo seed:', err)
  });

  let recapCount = 0;
  for (const group of GROUPS) {
    for (const wk of gradedWeeks[group.id]) {
      const facts = await buildFacts(
        supabase,
        group,
        wk.seasonYear,
        wk.weekNumber,
        wk.weekId,
        wk.isFinalWeek
      );
      await upsertRecap(supabase, facts);
      recapCount++;
    }
  }
  console.log(`Wrote ${recapCount} weekly recaps.`);

  // --- Admin screen data: settings + cron run log ----------------------------
  console.log('Seeding settings + cron_run_log…');
  const { error: settingsErr } = await supabase.from('settings').upsert({
    id: true,
    odds_api_monthly_cap: 500,
    odds_api_calls_used_current_month: 120,
    reset_on: iso(addDays(NOW, 9)).slice(0, 10)
  });
  if (settingsErr) throw new Error(`upsert settings failed: ${settingsErr.message}`);

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
      summary: { games_graded: curGradedGameIds.length }
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
    `   Seasons: ${currentYear - 2} & ${currentYear - 1} completed, ${currentYear} in progress.`
  );
  console.log(`   Groups: ${GROUPS.map((g) => g.name).join(', ')}.`);
  console.log('   Logins (password for all: "password"):');
  for (const p of PLAYERS) {
    console.log(`     - ${p.email}  (${p.display}${p.role === 'admin' ? ', admin' : ''})`);
  }
}

run().catch((err) => {
  console.error('\n❌ seed-demo failed:', err);
  process.exit(1);
});

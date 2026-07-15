import { createClient } from '@supabase/supabase-js';
import { E2E_USER, E2E_RESET_USER, E2E_MULTIGROUP_USER } from './test-user';

/**
 * Seeds the deterministic fixtures the E2E flows need into the LOCAL Supabase
 * stack. Auth users (admin@example.com / password123, etc.) already exist from
 * `supabase db reset`'s seed.sql; here we add the game data the picks and
 * leaderboard pages render. Idempotent so repeated local runs are safe.
 */
const SEASON_YEAR = 2026;
const WEEK_NUMBER = 1;
const GAME_TAG = 'e2e-game-1';
const ORIGINAL_GROUP_ID = '00000000-0000-4000-8000-000000000017';

// Dedicated second group for the group-switcher (#150) multi-group specs. A
// fixed id/name owned by this setup (not reused from another spec's fixture) so
// the switcher tests stay deterministic. The E2E_MULTIGROUP_USER belongs to
// both this group and the original; E2E_USER stays single-group.
const SWITCHER_SECOND_GROUP_ID = '00000000-0000-4000-8000-000000000150';
const SWITCHER_SECOND_GROUP_NAME = 'E2E Switcher B';

const DAY = 24 * 60 * 60 * 1000;

export default async function globalSetup() {
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
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email: E2E_USER.email,
    password: E2E_USER.password,
    email_confirm: true,
    user_metadata: { display_name: E2E_USER.displayName }
  });
  if (userErr && !/already|exists|registered/i.test(userErr.message)) {
    throw new Error('seed e2e user: ' + userErr.message);
  }

  // Resolve the E2E user's id (either freshly created or already existing).
  let e2eUserId: string | undefined = userData?.user?.id;
  if (!e2eUserId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    e2eUserId = list?.users.find((u) => u.email === E2E_USER.email)?.id;
  }

  // Elevate E2E user to admin so the admin UI is accessible in E2E tests,
  // and add them to the original group for group-scoped page access.
  //
  // These are two DIFFERENT roles and are routinely confused (see 7cba0c0):
  //   users.role: 'admin'                  → app-wide admin access (/admin)
  //   group_memberships.role: 'commissioner' → runs THIS league (/league/manage)
  //
  // The membership role is 'commissioner' since #660 made /league/manage a commissioner-only
  // console: this user drives the console specs. Member-facing coverage (no Manage entry, the
  // /league/manage and /group redirects, the /settings League card) uses E2E_MULTIGROUP_USER,
  // who is already a plain 'member' of this same league with its own storageState — so both
  // audiences are covered without a third fixture.
  //
  // E2E_USER must stay the league's ONLY commissioner: it is what makes the last-commissioner
  // "Leave league" guard testable at all. Promoting a second member would silently disarm that
  // spec rather than fail it, so any new commissioner belongs in a different group.
  if (e2eUserId) {
    await supabase.from('users').upsert(
      {
        id: e2eUserId,
        display_name: E2E_USER.displayName,
        role: 'admin',
        // Pre-set guide_seen_at so the How-to-Play welcome guide does not
        // auto-open and intercept clicks in unrelated e2e specs.
        guide_seen_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    await supabase
      .from('group_memberships')
      .upsert(
        { group_id: ORIGINAL_GROUP_ID, user_id: e2eUserId, role: 'commissioner' },
        { onConflict: 'group_id,user_id' }
      );

    // ---------------------------------------------------------------------------
    // Commissioner standings row (#660)
    //
    // The `Commissioner` marker on /league rides a STANDINGS row, and a standings row
    // exists only for a user with a settled pick (`leaderboard_season_totals` is built
    // from `pick_settlement`). E2E_USER places no picks, so without this the sole
    // commissioner never appears in the table and the marker has nothing to render on —
    // the assertion would pass vacuously against an empty set.
    //
    // Mirror the shape the seeded test1-3 already carry (a `missed` settlement, -1) on the
    // same game, so this adds a row to the standings without inventing new game state. It
    // must be E2E_USER rather than a promoted test1-3: those are the only members left to
    // keep the last-commissioner guard live (see above).
    //
    // The game must be in the season the standings actually DEFAULT to, which is the newest
    // one this group has settled rows for — not merely any settled game. Picking an arbitrary
    // settlement lands the row in an older season, where the League home never looks and the
    // marker spec fails for a reason that has nothing to do with the marker.
    const { data: newestRow } = await supabase
      .from('leaderboard_season_totals')
      .select('season_year')
      .eq('group_id', ORIGINAL_GROUP_ID)
      .order('season_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    const seedGameId = newestRow
      ? await (async () => {
          const { data: season } = await supabase
            .from('seasons')
            .select('id')
            .eq('year', newestRow.season_year)
            .maybeSingle();
          if (!season) return null;
          const { data: weeks } = await supabase
            .from('weeks')
            .select('id')
            .eq('season_id', season.id)
            .eq('is_scoring', true);
          if (!weeks?.length) return null;
          const { data: settled } = await supabase
            .from('pick_settlement')
            .select('game_id, games!inner(week_id)')
            .eq('group_id', ORIGINAL_GROUP_ID)
            .in(
              'games.week_id',
              weeks.map((w) => w.id)
            )
            .limit(1)
            .maybeSingle();
          return settled?.game_id ?? null;
        })()
      : null;

    if (seedGameId) {
      await supabase.from('pick_settlement').upsert(
        {
          group_id: ORIGINAL_GROUP_ID,
          user_id: e2eUserId,
          game_id: seedGameId,
          pick_id: null, // a `missed` settlement has no pick behind it
          outcome: 'missed',
          points_delta: -1
        },
        { onConflict: 'group_id,user_id,game_id' }
      );
      // The standings read the matview, not the table — without this the new row is invisible.
      await supabase.rpc('refresh_leaderboard_stats');
      console.log(
        `[e2e seed] commissioner standings row seeded in season ${newestRow!.season_year} (#660 marker)`
      );
    } else {
      throw new Error(
        'seed commissioner standings row (#660): no settled game found in the newest season for ' +
          'the original group. The Commissioner-marker specs assert against a real standings row, ' +
          'so failing here beats letting them pass against an empty table.'
      );
    }
  }

  // E2E password-reset user — kept separate from E2E_USER so the reset test can
  // change this password without breaking auth.setup.ts on subsequent runs.
  const { data: resetData, error: resetUserErr } = await supabase.auth.admin.createUser({
    email: E2E_RESET_USER.email,
    password: E2E_RESET_USER.password,
    email_confirm: true,
    user_metadata: { display_name: E2E_RESET_USER.displayName }
  });
  if (resetUserErr && !/already|exists|registered/i.test(resetUserErr.message)) {
    throw new Error('seed e2e reset user: ' + resetUserErr.message);
  }

  // Pre-set guide_seen_at for the reset user too. The reset test signs this user
  // in via a recovery token, landing on an authenticated /auth/reset; without
  // this, shouldAutoOpenGuide() fires and the welcome-guide modal overlays and
  // intercepts the "Update password" click, so the reset never submits.
  let resetUserId: string | undefined = resetData?.user?.id;
  if (!resetUserId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    resetUserId = list?.users.find((u) => u.email === E2E_RESET_USER.email)?.id;
  }
  if (resetUserId) {
    await supabase.from('users').upsert(
      {
        id: resetUserId,
        display_name: E2E_RESET_USER.displayName,
        guide_seen_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
  }

  // ---------------------------------------------------------------------------
  // Group-switcher (#150) multi-group fixture
  //
  // The switcher only renders for users in >1 group, so it needs a user with
  // two active memberships and a distinct second group. E2E_USER deliberately
  // stays single-group (the "no switcher" case), so a dedicated multi-group
  // user is used instead. Its active group is pinned to the original group
  // ("Sunday Bets") in multigroup-auth.setup.ts so the default is deterministic
  // regardless of membership ordering.
  // ---------------------------------------------------------------------------

  // Second group (idempotent by fixed id).
  const { error: secondGroupErr } = await supabase
    .from('groups')
    .upsert(
      { id: SWITCHER_SECOND_GROUP_ID, name: SWITCHER_SECOND_GROUP_NAME },
      { onConflict: 'id' }
    );
  if (secondGroupErr) throw new Error('seed switcher group: ' + secondGroupErr.message);

  // group_config may be required by leaderboard/scoring reads; seed it best-effort.
  await supabase
    .from('group_config')
    .upsert({ group_id: SWITCHER_SECOND_GROUP_ID }, { onConflict: 'group_id' })
    .then(() => null);

  // Multi-group user — created via the admin API so it can password-login.
  const { data: mgData, error: mgErr } = await supabase.auth.admin.createUser({
    email: E2E_MULTIGROUP_USER.email,
    password: E2E_MULTIGROUP_USER.password,
    email_confirm: true,
    user_metadata: { display_name: E2E_MULTIGROUP_USER.displayName }
  });
  if (mgErr && !/already|exists|registered/i.test(mgErr.message)) {
    throw new Error('seed e2e multigroup user: ' + mgErr.message);
  }
  let mgUserId: string | undefined = mgData?.user?.id;
  if (!mgUserId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    mgUserId = list?.users.find((u) => u.email === E2E_MULTIGROUP_USER.email)?.id;
  }
  if (mgUserId) {
    await supabase.from('users').upsert(
      {
        id: mgUserId,
        display_name: E2E_MULTIGROUP_USER.displayName,
        role: 'player',
        // Suppress the welcome guide so it never intercepts switcher clicks.
        guide_seen_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    // Member of BOTH groups → the switcher renders.
    await supabase.from('group_memberships').upsert(
      [
        { group_id: ORIGINAL_GROUP_ID, user_id: mgUserId, role: 'member' },
        { group_id: SWITCHER_SECOND_GROUP_ID, user_id: mgUserId, role: 'member' }
      ],
      { onConflict: 'group_id,user_id' }
    );
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

  // Remove any non-e2e games from this week so the picks board shows exactly
  // the one BUF @ KC card the specs expect. The demo seed may populate week 1
  // with graded games that break per-week game-count assertions (e.g. "1/5 saved").
  const { data: nonE2eGames } = await supabase
    .from('games')
    .select('id')
    .eq('week_id', weekId)
    .neq('external_game_id', GAME_TAG);
  if (nonE2eGames?.length) {
    const staleIds = nonE2eGames.map((g: { id: string }) => g.id);
    await supabase.from('picks').delete().in('game_id', staleIds);
    await supabase.from('game_lines').delete().in('game_id', staleIds);
    await supabase.from('games').delete().in('id', staleIds);
  }

  // Game — kickoff in the future so picks remain editable/lockable.
  const commenceTime = new Date(Date.now() + 2 * DAY).toISOString();
  let gameId: string;
  {
    // Find-or-create by *matchup*, not by external_game_id. uq_games_matchup is
    // unique on (week_id, unordered team pair), so a game cloned from prod (or a
    // pre-constraint run) sharing this week + team pair but carrying a different
    // external_game_id would otherwise miss this lookup and collide on insert.
    // Match either orientation since the constraint is order-independent.
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('week_id', weekId)
      .or(
        `and(home_team_id.eq.${home.id},away_team_id.eq.${away.id}),` +
          `and(home_team_id.eq.${away.id},away_team_id.eq.${home.id})`
      )
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

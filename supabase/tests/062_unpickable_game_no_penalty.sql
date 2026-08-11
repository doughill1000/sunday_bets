-- 062_unpickable_game_no_penalty.sql
-- pgTAP for ADR-0040 / #803: a game nobody was permitted to pick charges nobody.
--
-- lock_pick / lock_pick_all_groups refuse a pick on a game with no active line for the
-- league's source. The missed-penalty pass in _grade_games_by_ids had no matching gate, so a
-- game that reached kickoff unlined charged EVERY active member -1 for an inaction the system
-- itself had forced. public._game_was_pickable(group, game) is the shared rule; the missed
-- pass and public._settlement_owed both read it, so the write side and the completeness
-- surfaces can never disagree about what an unlined game owes.
--
-- Four shapes, all in one mixed week so the gate is proven to be per-GAME and per-LEAGUE
-- rather than a blunt week-level switch:
--
--   up-lined     -- normal line, pre-kickoff        -> penalty as before (no regression)
--   up-unlined   -- no game_lines row at all        -> no penalty for anybody
--   up-late      -- line fetched AFTER kickoff      -> no penalty (it was never pickable)
--   up-dk        -- line under 'draftkings' only    -> penalty for the DK league only
--
-- up-dk is the sharp edge: line_source is per-league config, so the same game must charge the
-- league that plays off DraftKings and exempt the league on FanDuel. A gate keyed off "any
-- line exists" would wrongly charge both; one keyed off the wrong source would exempt both.
--
-- Fixture hygiene (see the local-vs-CI note in the testing pack): both leagues pin
-- competition_starts_at AND joined_at to the '2000-01-01' include-all sentinel rather than
-- relying on the now() defaults, and every assertion is scoped to this fixture's own groups /
-- games, so the counts mean the same thing against a prod-cloned local DB and CI's seed-only DB.

begin;

select plan(12);

-- ── Seed ──────────────────────────────────────────────────────────────────────
select tests.create_supabase_user('up_fd');
select tests.create_supabase_user('up_dk');
select tests.create_supabase_user('up_picker');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('up_fd'),     'player', 'UP FanDuel'),
  (tests.get_supabase_uid('up_dk'),     'player', 'UP DraftKings'),
  (tests.get_supabase_uid('up_picker'), 'player', 'UP Picker')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- Two leagues that differ ONLY in which book they play off.
insert into public.groups (id, name, competition_starts_at) values
  ('00000000-0000-4000-8000-000000000f51', 'UP FanDuel League',   '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f52', 'UP DraftKings League','2000-01-01 00:00:00+00');

-- The FanDuel league leaves line_source unset on purpose: the default resolution
-- coalesce(line_source, 'fanduel') is itself part of the rule under test.
insert into public.group_config (group_id, line_source) values
  ('00000000-0000-4000-8000-000000000f52', 'draftkings')
on conflict (group_id) do update set line_source = excluded.line_source;

insert into public.group_memberships (group_id, user_id, role, status, joined_at) values
  ('00000000-0000-4000-8000-000000000f51', tests.get_supabase_uid('up_fd'),
   'commissioner', 'active', '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f51', tests.get_supabase_uid('up_picker'),
   'member', 'active', '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f52', tests.get_supabase_uid('up_dk'),
   'commissioner', 'active', '2000-01-01 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('UPH1', 'UP Home One', 'UPH1'), ('UPA1', 'UP Away One', 'UPA1'),
  ('UPH2', 'UP Home Two', 'UPH2'), ('UPA2', 'UP Away Two', 'UPA2'),
  ('UPH3', 'UP Home Three', 'UPH3'), ('UPA3', 'UP Away Three', 'UPA3'),
  ('UPH4', 'UP Home Four', 'UPH4'), ('UPA4', 'UP Away Four', 'UPA4')
on conflict (external_key) do nothing;

insert into public.seasons (id, league, year, grading_locked) values
  (9970, 'NFL', 2070, false)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99701, 9970, 1, '2070-09-08 00:00:00+00', '2070-09-15 00:00:00+00', true);

-- One week, four games. uq_games_matchup is per (week, team pair), hence four team pairs.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99701, g.ext, g.commence, home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from (values
  ('up-lined',   '2070-09-10 17:00:00+00'::timestamptz, 'UPH1', 'UPA1'),
  ('up-unlined', '2070-09-10 18:00:00+00'::timestamptz, 'UPH2', 'UPA2'),
  ('up-late',    '2070-09-10 19:00:00+00'::timestamptz, 'UPH3', 'UPA3'),
  ('up-dk',      '2070-09-10 20:00:00+00'::timestamptz, 'UPH4', 'UPA4')
) g(ext, commence, home_key, away_key)
join public.teams home on home.external_key = g.home_key
join public.teams away on away.external_key = g.away_key
on conflict (external_game_id) do nothing;

-- up-lined: a normal FanDuel line, half an hour before kickoff -> pickable by the FD league.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
select g.id, 'fanduel', g.home_team_id, 6, true, g.commence_time - interval '30 minutes'
from public.games g where g.external_game_id = 'up-lined';

-- up-late: the ONLY line arrives an hour AFTER kickoff. lock_pick would have rejected every
-- pick on this game ('edits are not allowed after kickoff' / no line before that), so it was
-- never pickable -- which is why the rule reads fetched_at rather than is_active_line.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
select g.id, 'fanduel', g.home_team_id, 6, true, g.commence_time + interval '1 hour'
from public.games g where g.external_game_id = 'up-late';

-- up-dk: a pre-kickoff line filed under 'draftkings' only.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
select g.id, 'draftkings', g.home_team_id, 6, true, g.commence_time - interval '30 minutes'
from public.games g where g.external_game_id = 'up-dk';

-- up-unlined gets no game_lines row at all -- the #803 shape.

-- A real pick on the lined game, so pass (1) is exercised alongside the missed pass and a
-- pickability effect can never be confused with grading breaking outright.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f51',
  tests.get_supabase_uid('up_picker'),
  g.id, g.home_team_id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', g.home_team_id, 6,
  tests.get_supabase_uid('up_picker')
from public.games g where g.external_game_id = 'up-lined';

-- ── The helper itself ─────────────────────────────────────────────────────────
select is(
  public._game_was_pickable(
    '00000000-0000-4000-8000-000000000f51',
    (select id from public.games where external_game_id = 'up-lined')),
  true,
  'helper: a pre-kickoff line for the league''s source is pickable'
);

select is(
  public._game_was_pickable(
    '00000000-0000-4000-8000-000000000f51',
    (select id from public.games where external_game_id = 'up-unlined')),
  false,
  'helper: no line at all is not pickable'
);

select is(
  public._game_was_pickable(
    '00000000-0000-4000-8000-000000000f51',
    (select id from public.games where external_game_id = 'up-late')),
  false,
  'helper: a line fetched after kickoff is not pickable (fetched_at, not is_active_line)'
);

select is(
  public._game_was_pickable(
    '00000000-0000-4000-8000-000000000f51',
    (select id from public.games where external_game_id = 'up-dk')),
  false,
  'helper: a line under another book is invisible to a FanDuel league'
);

select is(
  public._game_was_pickable(
    '00000000-0000-4000-8000-000000000f52',
    (select id from public.games where external_game_id = 'up-dk')),
  true,
  'helper: the same game IS pickable for the league configured to that book'
);

-- ── Grade the whole mixed week at once (the grade_week / cron shape) ───────────
select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'up-%')
);

-- ── The defect: an unpickable game must charge nobody ─────────────────────────
select is_empty(
  $$ select 1
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where g.external_game_id in ('up-unlined', 'up-late') $$,
  '#803: a game that never had a pickable line produces NO settlement rows at all'
);

-- ── No regression: a lined game still penalizes non-pickers exactly as before ──
select results_eq(
  $$ select g.external_game_id, ps.outcome::text, ps.points_delta
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('up_fd')
     order by g.commence_time $$,
  $$ values ('up-lined', 'missed', -1) $$,
  'a lined game still charges the non-picker -1 (ADR-0024 membership scoping intact)'
);

select results_eq(
  $$ select g.external_game_id, ps.outcome::text, ps.points_delta
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('up_picker')
     order by g.commence_time $$,
  $$ values ('up-lined', 'win', 1) $$,
  'the real-pick pass is untouched: home covers -6 on a 20-10 final'
);

-- ── Per-league, not per-game: up-dk splits the two leagues ────────────────────
select results_eq(
  $$ select g.external_game_id, ps.outcome::text, ps.points_delta
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('up_dk')
     order by g.commence_time $$,
  $$ values ('up-dk', 'missed', -1) $$,
  'the DraftKings league pays for the game its own book lined, and for nothing else'
);

select is_empty(
  $$ select 1
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where g.external_game_id = 'up-dk'
       and ps.group_id = '00000000-0000-4000-8000-000000000f51' $$,
  'the FanDuel league is exempt from the same game -- the gate is per-league, not per-game'
);

-- ── _settlement_owed agrees with what grading actually wrote ──────────────────
-- Without this the completeness pair would flag up-unlined as unsettled on every tick
-- forever: it is final, it now has zero settlement rows, and nothing could ever heal it.
select is(
  public._settlement_owed((select id from public.games where external_game_id = 'up-unlined')),
  false,
  '_settlement_owed: an unpickable game with no picks owes nothing, so the sweep lets it go'
);

-- ── Idempotency: re-grading never resurrects a correctly withheld penalty ─────
create temporary table up_before on commit drop as
select group_id, user_id, game_id, outcome, points_delta
from public.pick_settlement ps
where exists (select 1 from public.games g
              where g.id = ps.game_id and g.external_game_id like 'up-%');

select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'up-%')
);
select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'up-%')
);

select set_eq(
  $$ select group_id, user_id, game_id, outcome, points_delta
     from public.pick_settlement ps
     where exists (select 1 from public.games g
                   where g.id = ps.game_id and g.external_game_id like 'up-%') $$,
  $$ select group_id, user_id, game_id, outcome, points_delta from up_before $$,
  're-grading twice is idempotent -- a withheld penalty is never resurrected'
);

select * from finish();
rollback;

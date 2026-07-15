-- 056_advance_week_completeness.sql
-- pgTAP for issue #658: advance_week_if_complete() (used by the rollover-week cron)
-- compared v_settled_picks (pick_settlement row count) against v_total_picks (real
-- picks row count) to decide completeness. pick_settlement legitimately carries
-- synthetic 'missed' rows for every active member who didn't pick (see
-- _grade_games_by_ids), so settled rows almost always outnumber real picks and the
-- equality check could essentially never pass once anyone missed a pick -- confirmed
-- on prod: rollover-week failed every run for weeks with "N/M picks settled" even
-- though every game was final.
--
-- The fix mirrors find_unsettled_weeks' predicate (see 045_reconcile_grade_sweep.sql):
-- a week is complete once every final game has at least one pick_settlement row,
-- independent of how the picks-vs-settlements counts compare.
--
-- advance_week_if_complete() has no group/season scoping -- it always targets the
-- single globally most-recently-concluded week (max end_ts < now()). Each scenario
-- below is staged with a strictly later end_ts than the last, so it becomes "the"
-- target week at the moment its assertions run, without disturbing earlier scenarios.

begin;

select plan(7);

-- Seed: one group, a picker + a non-picker (both active members) ----------------
select tests.create_supabase_user('awc_picker');
select tests.create_supabase_user('awc_skipper');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('awc_picker'),  'player', 'AWC Picker'),
  (tests.get_supabase_uid('awc_skipper'), 'player', 'AWC Skipper')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000a61', 'AWC Group');

insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000a61', tests.get_supabase_uid('awc_picker'),  'member', 'active'),
  ('00000000-0000-4000-8000-000000000a61', tests.get_supabase_uid('awc_skipper'), 'member', 'active');

insert into public.teams (external_key, name, short_name) values
  ('AWCH', 'AWC Home', 'AWCH'),
  ('AWCA', 'AWC Away', 'AWCA'),
  ('AWCH2', 'AWC Home 2', 'AWH2'),
  ('AWCA2', 'AWC Away 2', 'AWA2')
on conflict (external_key) do nothing;

insert into public.seasons (id, league, year, grading_locked) values
  (9960, 'NFL', 2060, false)
on conflict (league, year) do nothing;

-- ── Week A: a missed pick, but the (one) final game IS settled ──────────────────
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99601, 9960, 1, now() - interval '4 days', now() - interval '3 days');

insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99601, 'awc-a', now() - interval '3 days 1 hour', home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from public.teams home, public.teams away
where home.external_key = 'AWCH' and away.external_key = 'AWCA'
on conflict (external_game_id) do nothing;

insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000a61',
  tests.get_supabase_uid('awc_picker'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('awc_picker')
from public.games g
cross join public.teams home
where g.external_game_id = 'awc-a' and home.external_key = 'AWCH'
on conflict (group_id, user_id, game_id) do nothing;

-- Grade it: yields 1 real 'win' row (picker) + 1 synthetic 'missed' row (skipper) --
-- 2 settlement rows against 1 real pick, exactly the shape that broke the old check.
select public._grade_games_by_ids(array[(select id from public.games where external_game_id = 'awc-a')]);

select is(
  (public.advance_week_if_complete()->>'ok')::boolean,
  true,
  '(1) Week A: ok=true even though settlement rows (2) outnumber real picks (1)'
);

select is(
  (public.advance_week_if_complete()->>'unsettled_final_games')::int,
  0,
  '(2) Week A: unsettled_final_games=0 -- the only final game has settlement rows'
);

-- ── Week B: a final game that has NOT been graded at all (genuinely unsettled) ──
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99602, 9960, 2, now() - interval '3 days', now() - interval '2 days');

insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99602, 'awc-b', now() - interval '2 days 1 hour', home.id, away.id, 'final', '{"home": 14, "away": 20}'::jsonb
from public.teams home, public.teams away
where home.external_key = 'AWCH' and away.external_key = 'AWCA'
on conflict (external_game_id) do nothing;

select is(
  (public.advance_week_if_complete()->>'ok')::boolean,
  false,
  '(3) Week B: ok=false -- the final game has zero pick_settlement rows'
);

select is(
  (public.advance_week_if_complete()->>'unsettled_final_games')::int,
  1,
  '(4) Week B: unsettled_final_games=1 names the ungraded final game'
);

-- ── Week C: not every game is final yet; a postponed game is excluded entirely ──
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99603, 9960, 3, now() - interval '2 days', now() - interval '1 day');

insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99603, g.ext, now() - interval '1 day 1 hour', home.id, away.id, g.status, g.final_scores
from (values
  ('awc-c-scheduled', 'scheduled'::text, null::jsonb, 'AWCH', 'AWCA'),
  ('awc-c-postponed', 'postponed', null::jsonb, 'AWCH2', 'AWCA2')
) g(ext, status, final_scores, home_key, away_key)
join public.teams home on home.external_key = g.home_key
join public.teams away on away.external_key = g.away_key
on conflict (external_game_id) do nothing;

select is(
  (public.advance_week_if_complete()->>'ok')::boolean,
  false,
  '(5) Week C: ok=false -- not every non-postponed game is final yet'
);

select is(
  (public.advance_week_if_complete()->>'total_games')::int,
  1,
  '(6) Week C: total_games excludes the postponed game'
);

select is(
  (public.advance_week_if_complete()->>'final_games')::int,
  0,
  '(7) Week C: final_games=0 -- the one counted game is still scheduled'
);

select * from finish();
rollback;

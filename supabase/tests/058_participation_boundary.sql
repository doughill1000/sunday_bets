-- 058_participation_boundary.sql
-- pgTAP for ADR-0037 / #712: a member is settled for a game only when it starts on or after
--
--   greatest(groups.competition_starts_at, group_memberships.joined_at)
--
-- i.e. public._participation_start(group, member) -- the single definition shared by the
-- grading choke point, the completeness guard (055), and the boundary-aware read surfaces.
--
-- Before this, the missed-pass in _grade_games_by_ids enumerated every active member with no
-- pick and no lower time bound, so EVERY re-grade manufactured a -1 for games played before a
-- member joined (and grade_season reaches the whole unlocked season). Two real paths, both
-- covered below:
--
--   (A) midseason JOIN      -- binding term is joined_at   (pb_late in the PB Early group)
--   (B) midseason CREATION  -- binding term is the league's competition start (PB Late group)
--
-- The within-week case is the sharp edge: pb_late joins BETWEEN two games of the same week,
-- so the boundary must split that week rather than include or exclude it wholesale.

begin;

select plan(10);

-- ── Structural ────────────────────────────────────────────────────────────────
select has_column('public', 'groups', 'competition_starts_at', 'groups has competition_starts_at');
select col_not_null('public', 'groups', 'competition_starts_at', 'competition_starts_at is not null');

-- Seed ------------------------------------------------------------------------
select tests.create_supabase_user('pb_founder');
select tests.create_supabase_user('pb_late');
select tests.create_supabase_user('pb_midseason');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('pb_founder'),   'player', 'PB Founder'),
  (tests.get_supabase_uid('pb_late'),      'player', 'PB Late'),
  (tests.get_supabase_uid('pb_midseason'), 'player', 'PB Midseason')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- Two leagues. "PB Early" existed all along (sentinel start, the shape every pre-ADR league
-- gets from the backfill); "PB Late" was created in week 3 (the midseason-creation case).
insert into public.groups (id, name, competition_starts_at) values
  ('00000000-0000-4000-8000-000000000f31', 'PB Early', '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f32', 'PB Late',  '2060-09-22 00:00:00+00');

-- pb_founder is there from the start; pb_late joins mid-week-2, between its two kickoffs.
-- pb_midseason's own joined_at is early on purpose: in the PB Late league the LEAGUE's start
-- is the binding term, which is what separates case (B) from case (A).
insert into public.group_memberships (group_id, user_id, role, status, joined_at) values
  ('00000000-0000-4000-8000-000000000f31', tests.get_supabase_uid('pb_founder'),
   'commissioner', 'active', '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f31', tests.get_supabase_uid('pb_late'),
   'member', 'active', '2060-09-19 18:00:00+00'),
  ('00000000-0000-4000-8000-000000000f32', tests.get_supabase_uid('pb_midseason'),
   'commissioner', 'active', '2000-01-01 00:00:00+00');

-- Four teams: week 2 holds two games, and uq_games_matchup is per (week, team pair).
insert into public.teams (external_key, name, short_name) values
  ('PBH1', 'PB Home One', 'PBH1'),
  ('PBA1', 'PB Away One', 'PBA1'),
  ('PBH2', 'PB Home Two', 'PBH2'),
  ('PBA2', 'PB Away Two', 'PBA2')
on conflict (external_key) do nothing;

insert into public.seasons (id, league, year, grading_locked) values
  (9960, 'NFL', 2060, false)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99601, 9960, 1, '2060-09-10 00:00:00+00', '2060-09-17 00:00:00+00', true),
  (99602, 9960, 2, '2060-09-17 00:00:00+00', '2060-09-24 00:00:00+00', true),
  (99603, 9960, 3, '2060-09-24 00:00:00+00', '2060-10-01 00:00:00+00', true);

-- pb-w2-early (17:00) and pb-w2-late (21:00) straddle pb_late's 18:00 join.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from (values
  (99601, 'pb-w1',       '2060-09-12 17:00:00+00'::timestamptz, 'PBH1', 'PBA1'),
  (99602, 'pb-w2-early', '2060-09-19 17:00:00+00'::timestamptz, 'PBH1', 'PBA1'),
  (99602, 'pb-w2-late',  '2060-09-19 21:00:00+00'::timestamptz, 'PBH2', 'PBA2'),
  (99603, 'pb-w3',       '2060-09-26 17:00:00+00'::timestamptz, 'PBH1', 'PBA1')
) g(week_id, ext, commence, home_key, away_key)
join public.teams home on home.external_key = g.home_key
join public.teams away on away.external_key = g.away_key
on conflict (external_game_id) do nothing;

-- pb_founder picks week 1 (home covers -6: margin (20-10)-6 = +4 -> win), so the real-pick
-- pass is exercised alongside the missed pass and cannot be confused with a boundary effect.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f31',
  tests.get_supabase_uid('pb_founder'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('pb_founder')
from public.games g
join public.teams home on home.external_key = 'PBH1'
where g.external_game_id = 'pb-w1';

-- Grade the whole season's worth at once -- the grade_season / cron shape, i.e. the path that
-- reaches back over games that predate a member's participation.
select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'pb-%')
);

-- ── (A) midseason JOIN: joined_at is the binding term ─────────────────────────
select results_eq(
  $$ select g.external_game_id, ps.outcome::text, ps.points_delta
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('pb_late')
     order by g.commence_time $$,
  $$ values ('pb-w2-late', 'missed', -1), ('pb-w3', 'missed', -1) $$,
  '(A) a midseason joiner is settled only from their join forward -- and exactly once per game'
);

select is_empty(
  $$ select 1
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('pb_late')
       and g.external_game_id in ('pb-w1', 'pb-w2-early') $$,
  '(A) no penalty for games played before they joined, including earlier the same week'
);

-- ── (B) midseason CREATION: the league start is the binding term ──────────────
select results_eq(
  $$ select g.external_game_id, ps.outcome::text
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('pb_midseason')
     order by g.commence_time $$,
  $$ values ('pb-w3', 'missed') $$,
  '(B) a league created midseason accrues nothing for the weeks before it existed'
);

-- ── The boundary does not weaken normal grading for eligible members ──────────
select results_eq(
  $$ select g.external_game_id, ps.outcome::text, ps.points_delta
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('pb_founder')
     order by g.commence_time $$,
  $$ values ('pb-w1', 'win', 1), ('pb-w2-early', 'missed', -1),
            ('pb-w2-late', 'missed', -1), ('pb-w3', 'missed', -1) $$,
  'a fully eligible member still grades normally: real pick wins, every skip is a -1'
);

-- ── Idempotency: re-grading cannot move the boundary or backfill older misses ──
create temporary table pb_before on commit drop as
select group_id, user_id, game_id, outcome, points_delta
from public.pick_settlement ps
where exists (select 1 from public.games g
              where g.id = ps.game_id and g.external_game_id like 'pb-%');

select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'pb-%')
);
select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'pb-%')
);

select set_eq(
  $$ select group_id, user_id, game_id, outcome, points_delta
     from public.pick_settlement ps
     where exists (select 1 from public.games g
                   where g.id = ps.game_id and g.external_game_id like 'pb-%') $$,
  $$ select group_id, user_id, game_id, outcome, points_delta from pb_before $$,
  're-grading twice is idempotent -- no pre-participation row is ever manufactured'
);

-- ── Re-activation is forward-only (ADR-0037 ruling 6) ─────────────────────────
-- Removal hard-DELETEs the membership; re-joining inserts a FRESH row with a new joined_at.
-- pick_settlement does not cascade off group_memberships, so the pre-removal history stays.
delete from public.group_memberships
where group_id = '00000000-0000-4000-8000-000000000f31'
  and user_id = tests.get_supabase_uid('pb_late');

insert into public.group_memberships (group_id, user_id, role, status, joined_at) values
  ('00000000-0000-4000-8000-000000000f31', tests.get_supabase_uid('pb_late'),
   'member', 'active', '2060-09-30 00:00:00+00');  -- after every game above

select public._grade_games_by_ids(
  array(select id from public.games where external_game_id like 'pb-%')
);

select results_eq(
  $$ select g.external_game_id, ps.outcome::text
     from public.pick_settlement ps
     join public.games g on g.id = ps.game_id
     where ps.user_id = tests.get_supabase_uid('pb_late')
     order by g.commence_time $$,
  $$ values ('pb-w2-late', 'missed'), ('pb-w3', 'missed') $$,
  'a re-joined member keeps their pre-removal history and gains nothing for the gap'
);

-- ── The helper is the shared definition, and it is conservative on non-members ─
select is(
  public._participation_start(
    '00000000-0000-4000-8000-000000000f32', tests.get_supabase_uid('pb_midseason')
  ),
  '2060-09-22 00:00:00+00'::timestamptz,
  'the boundary is the LATER of the league start and the join'
);

select is(
  public._participation_start(
    '00000000-0000-4000-8000-000000000f31', tests.get_supabase_uid('pb_midseason')
  ),
  null,
  'a non-member has no participation start, so every comparison excludes them'
);

select * from finish();
rollback;

-- 055_pick_settlement_completeness.sql
-- pgTAP for issue #650: a single 2025 game had 5 pick_settlement rows instead of 6 --
-- one active league member (an app admin) silently had NO row (neither a real pick
-- nor a 'missed' penalty) for a game everyone else was correctly settled for. The
-- root cause (the pre-#447 missed-penalty pass filtering on global users.role='player'
-- instead of active group membership) is already fixed and regression-tested by
-- 043_grading_membership_and_frozen_seasons.sql. This file adds the complementary,
-- MECHANISM-AGNOSTIC guard the issue asks for: a completeness check that would catch
-- ANY future defect that drops one active member's row from an otherwise-graded game,
-- not just the one bug we already know about.
--
-- Division of labour with the existing reconcile-sweep predicate
-- (find_unsettled_weeks(), #433, see 045_reconcile_grade_sweep.sql): that predicate
-- flags a game with ZERO pick_settlement rows (fully stranded). It does NOT flag a
-- PARTIALLY settled game (5 of 6 rows) because "at least one row exists" is already
-- true. This test's gap query is the missing half: for a (group, game) pair that HAS
-- begun settling (>= 1 row already present), every currently-active member of that
-- group must have exactly one row.
--
-- Deliberate exclusions (mirrors the acceptance criteria):
--   - grading_locked seasons (2022-24 imported seasons, ADR-0024) are excluded -- they
--     legitimately have zero 'missed' rows for anyone, a known data-provenance fact,
--     not a gap of this kind.
--   - a game with no final score yet is excluded -- it has not been graded, so an
--     active member having no row for it is expected, not a defect.
--   - w.is_scoring, matching the acceptance criteria's "every scoring game" wording.
--
-- Known, accepted limitation: this predicate assumes a stable membership within a
-- season (true of this app's actual usage -- a private, invite-capped league). A
-- member who joins a group strictly after an old game was already graded would be
-- flagged even though that is not a bug; this product does not exercise that path
-- today, and the false-positive cost is a noisy assertion, not a silent gap.

begin;

select plan(4);

-- Seed: one group, three active members (an app admin + two players) -----------
select tests.create_supabase_user('psc_admin');
select tests.create_supabase_user('psc_player');
select tests.create_supabase_user('psc_picker');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('psc_admin'),  'admin',  'PSC Admin'),
  (tests.get_supabase_uid('psc_player'), 'player', 'PSC Player'),
  (tests.get_supabase_uid('psc_picker'), 'player', 'PSC Picker')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000f21', 'PSC Group');

insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000f21', tests.get_supabase_uid('psc_admin'),  'member', 'active'),
  ('00000000-0000-4000-8000-000000000f21', tests.get_supabase_uid('psc_player'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000000f21', tests.get_supabase_uid('psc_picker'), 'member', 'active');

insert into public.teams (external_key, name, short_name) values
  ('PSCH', 'PSC Home', 'PSCH'),
  ('PSCA', 'PSC Away', 'PSCA')
on conflict (external_key) do nothing;

-- Live (unlocked, scoring) season 2056; frozen (locked) season 2020, both scoring.
insert into public.seasons (id, league, year, grading_locked) values
  (9958, 'NFL', 2056, false),
  (9959, 'NFL', 2020, true)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99581, 9958, 1, '2056-09-04 00:00:00+00', '2056-09-11 00:00:00+00', true),
  (99582, 9958, 2, '2056-09-11 00:00:00+00', '2056-09-18 00:00:00+00', true),
  (99591, 9959, 1, '2020-09-06 00:00:00+00', '2020-09-13 00:00:00+00', true);

-- psc-live: final, graded below. psc-not-final: no final score yet (still to play).
-- psc-locked: final, but in a grading_locked season -- mirrors the real 2022-24
-- provenance fact of zero settlement rows despite active members existing.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, g.status, g.final_scores
from (values
  (99581, 'psc-live',      '2056-09-07 17:00:00+00'::timestamptz, 'final'::text, '{"home": 20, "away": 10}'::jsonb),
  (99582, 'psc-not-final', '2056-09-14 17:00:00+00'::timestamptz, 'scheduled',   null::jsonb),
  (99591, 'psc-locked',    '2020-09-09 17:00:00+00'::timestamptz, 'final',       '{"home": 20, "away": 10}'::jsonb)
) g(week_id, ext, commence, status, final_scores)
cross join public.teams home
cross join public.teams away
where home.external_key = 'PSCH' and away.external_key = 'PSCA'
on conflict (external_game_id) do nothing;

-- Only the picker picks the live game (home covers -6: margin (20-10)-6 = +4 -> win).
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f21',
  tests.get_supabase_uid('psc_picker'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('psc_picker')
from public.games g
cross join public.teams home
where g.external_game_id = 'psc-live'
  and home.external_key = 'PSCH'
on conflict (group_id, user_id, game_id) do nothing;

-- The completeness gap query under test: an active member of a game's group with no
-- pick_settlement row, restricted to scoring games that have already had grading
-- begin for that group (>= 1 settlement row already present) in a non-locked season.
-- Scoped per-assertion by external_game_id so unrelated fixture/seed data can't leak in.

-- ── (1) Grade the live game normally: completeness holds, no gap ─────────────────
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'psc-live')]
);

select is_empty(
  $$
  select gm.user_id
  from public.games g
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.group_memberships gm on gm.status = 'active'
  where g.external_game_id = 'psc-live'
    and w.is_scoring
    and not s.grading_locked
    and (g.final_scores->>'home') is not null
    and exists (
      select 1 from public.pick_settlement ps2
      where ps2.game_id = g.id and ps2.group_id = gm.group_id
    )
    and not exists (
      select 1 from public.pick_settlement ps
      where ps.game_id = g.id and ps.group_id = gm.group_id and ps.user_id = gm.user_id
    )
  $$,
  '(1) a normally-graded scoring game has a row for every active member -- no gap'
);

-- ── (2) Simulate the #650 defect: drop one active member's row after grading ─────
-- This is exactly what the old admin-role exemption produced (already fixed
-- upstream, see 043) -- reproducing the resulting DATA shape here, not the fixed
-- code path, so the completeness check is proven to catch the shape regardless of
-- which future mechanism produces it.
delete from public.pick_settlement
where group_id = '00000000-0000-4000-8000-000000000f21'
  and user_id  = tests.get_supabase_uid('psc_admin')
  and game_id  = (select id from public.games where external_game_id = 'psc-live');

select results_eq(
  $$
  select gm.user_id
  from public.games g
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.group_memberships gm on gm.status = 'active'
  where g.external_game_id = 'psc-live'
    and w.is_scoring
    and not s.grading_locked
    and (g.final_scores->>'home') is not null
    and exists (
      select 1 from public.pick_settlement ps2
      where ps2.game_id = g.id and ps2.group_id = gm.group_id
    )
    and not exists (
      select 1 from public.pick_settlement ps
      where ps.game_id = g.id and ps.group_id = gm.group_id and ps.user_id = gm.user_id
    )
  $$,
  $$ values (tests.get_supabase_uid('psc_admin')) $$,
  '(2) a dropped row for one active member is loud: the gap query names them'
);

-- ── (3) A grading_locked (2022-24-style) season's zero-row game is NOT a gap ─────
select is_empty(
  $$
  select gm.user_id
  from public.games g
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.group_memberships gm on gm.status = 'active'
  where g.external_game_id = 'psc-locked'
    and w.is_scoring
    and not s.grading_locked
    and (g.final_scores->>'home') is not null
    and exists (
      select 1 from public.pick_settlement ps2
      where ps2.game_id = g.id and ps2.group_id = gm.group_id
    )
    and not exists (
      select 1 from public.pick_settlement ps
      where ps.game_id = g.id and ps.group_id = gm.group_id and ps.user_id = gm.user_id
    )
  $$,
  '(3) a grading_locked season''s ungraded game is excluded (2022-24 provenance, not a gap)'
);

-- ── (4) A not-yet-final game is NOT a gap (it hasn't been graded yet) ────────────
select is_empty(
  $$
  select gm.user_id
  from public.games g
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.group_memberships gm on gm.status = 'active'
  where g.external_game_id = 'psc-not-final'
    and w.is_scoring
    and not s.grading_locked
    and (g.final_scores->>'home') is not null
    and exists (
      select 1 from public.pick_settlement ps2
      where ps2.game_id = g.id and ps2.group_id = gm.group_id
    )
    and not exists (
      select 1 from public.pick_settlement ps
      where ps.game_id = g.id and ps.group_id = gm.group_id and ps.user_id = gm.user_id
    )
  $$,
  '(4) a game with no final score yet is excluded -- not graded, not a gap'
);

select * from finish();
rollback;

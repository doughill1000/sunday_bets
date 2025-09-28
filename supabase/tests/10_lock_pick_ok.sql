-- Tests: happy path + final week All-In allowance + non-final week single All-In
begin;
select plan(8);

-- Simulate authenticated user
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
set local role authenticated;

-- Basic existence
select has_function(
  'public',
  'lock_pick',
  array['uuid','public.side_enum','public.weight_enum','text'],
  'lock_pick function exists with expected signature'
);

-- Minimal fixtures
-- Teams
insert into public.teams (id, name) values (1001,'Team H') on conflict do nothing;
insert into public.teams (id, name) values (1002,'Team A') on conflict do nothing;

-- Season + weeks (week 1 and final week 18)
insert into public.seasons (id, year) values (9001, 2099)
  on conflict do nothing;

insert into public.weeks (id, season_id, week_number, label)
values 
  (9101, 9001, 1, 'Week 1'),
  (9118, 9001, 18, 'Week 18')
on conflict do nothing;

-- Game in week 1
insert into public.games (id, week_id, home_team_id, away_team_id, commence_time)
values ('11111111-1111-1111-1111-111111111111', 9101, 1001, 1002, now() + interval '3 hours')
on conflict do nothing;

-- Game in final week
insert into public.games (id, week_id, home_team_id, away_team_id, commence_time)
values ('22222222-2222-2222-2222-222222222222', 9118, 1001, 1002, now() + interval '3 hours')
on conflict do nothing;

-- Active lines (canonical positive favorite model)
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
values
  ('11111111-1111-1111-1111-111111111111','fanduel',1001,3.5,true, now()),
  ('22222222-2222-2222-2222-222222222222','fanduel',1002,2.0,true, now())
on conflict do nothing;

-- 1) Standard lock (week 1)
with r as (
  select * from public.lock_pick('11111111-1111-1111-1111-111111111111',
                                 'home'::public.side_enum,
                                 'L'::public.weight_enum,
                                 'fanduel')
)
select ok( (select ok from r), 'Week1 regular pick ok');

-- 2) First All-In in week 1
with r as (
  select * from public.lock_pick('11111111-1111-1111-1111-111111111111',
                                 'away'::public.side_enum,
                                 'A'::public.weight_enum,
                                 'fanduel')
)
select ok( (select ok from r), 'Week1 first All-In ok (upsert same game)');

-- Create second game same week to test All-In uniqueness
insert into public.games (id, week_id, home_team_id, away_team_id, commence_time)
values ('33333333-3333-3333-3333-333333333333', 9101, 1002, 1001, now() + interval '4 hours');

insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
values ('33333333-3333-3333-3333-333333333333','fanduel',1002,1.0,true, now());

-- 3) Second All-In in same (non-final) week should fail
do $$
declare
  v_err text;
begin
  begin
    perform public.lock_pick('33333333-3333-3333-3333-333333333333',
                             'home'::public.side_enum,
                             'A'::public.weight_enum,
                             'fanduel');
    perform fail('Expected error on second All-In in non-final week');
  exception when others then
    v_err := sqlerrm;
    if position('all in already used this week' in lower(v_err)) > 0 then
      perform pass('Second All-In correctly rejected');
    else
      perform fail('Unexpected error message: '||v_err);
    end if;
  end;
end
$$;

-- 4) All-In in final week first time
with r as (
  select * from public.lock_pick('22222222-2222-2222-2222-222222222222',
                                 'home'::public.side_enum,
                                 'A'::public.weight_enum,
                                 'fanduel')
)
select ok( (select ok from r), 'Final week All-In ok');

-- 5) All-In again same final-week game (upsert allowed)
with r as (
  select * from public.lock_pick('22222222-2222-2222-2222-222222222222',
                                 'away'::public.side_enum,
                                 'A'::public.weight_enum,
                                 'fanduel')
)
select ok( (select ok from r), 'Final week re-lock All-In ok (upsert)');

-- 6) locked_at present (non-null)
select ok( (select locked_at is not null from public.lock_pick(
              '11111111-1111-1111-1111-111111111111',
              'home'::public.side_enum,
              'L'::public.weight_enum,
              'fanduel')), 'locked_at populated');

-- 7) Weight persisted as requested
with r as (
  select * from public.lock_pick('11111111-1111-1111-1111-111111111111',
                                 'home'::public.side_enum,
                                 'M'::public.weight_enum,
                                 'fanduel')
)
select is( (select weight::text from r), 'M', 'Weight updated to M');

-- 8) Side persisted
with r as (
  select * from public.lock_pick('11111111-1111-1111-1111-111111111111',
                                 'away'::public.side_enum,
                                 'M'::public.weight_enum,
                                 'fanduel')
)
select is( (select picked_side::text from r), 'away', 'Picked side updated to away');

select * from finish();
rollback;
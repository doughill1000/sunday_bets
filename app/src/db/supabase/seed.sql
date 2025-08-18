-- Seed data for all NFL teams
-- Format: league, external_key, name, short_name

insert into teams (league, external_key, name, short_name) values
('NFL','ARI','Arizona Cardinals','ARI'),
('NFL','ATL','Atlanta Falcons','ATL'),
('NFL','BAL','Baltimore Ravens','BAL'),
('NFL','BUF','Buffalo Bills','BUF'),
('NFL','CAR','Carolina Panthers','CAR'),
('NFL','CHI','Chicago Bears','CHI'),
('NFL','CIN','Cincinnati Bengals','CIN'),
('NFL','CLE','Cleveland Browns','CLE'),
('NFL','DAL','Dallas Cowboys','DAL'),
('NFL','DEN','Denver Broncos','DEN'),
('NFL','DET','Detroit Lions','DET'),
('NFL','GB','Green Bay Packers','GB'),
('NFL','HOU','Houston Texans','HOU'),
('NFL','IND','Indianapolis Colts','IND'),
('NFL','JAX','Jacksonville Jaguars','JAX'),
('NFL','KC','Kansas City Chiefs','KC'),
('NFL','LV','Las Vegas Raiders','LV'),
('NFL','LAC','Los Angeles Chargers','LAC'),
('NFL','LAR','Los Angeles Rams','LAR'),
('NFL','MIA','Miami Dolphins','MIA'),
('NFL','MIN','Minnesota Vikings','MIN'),
('NFL','NE','New England Patriots','NE'),
('NFL','NO','New Orleans Saints','NO'),
('NFL','NYG','New York Giants','NYG'),
('NFL','NYJ','New York Jets','NYJ'),
('NFL','PHI','Philadelphia Eagles','PHI'),
('NFL','PIT','Pittsburgh Steelers','PIT'),
('NFL','SF','San Francisco 49ers','SF'),
('NFL','SEA','Seattle Seahawks','SEA'),
('NFL','TB','Tampa Bay Buccaneers','TB'),
('NFL','TEN','Tennessee Titans','TEN'),
('NFL','WAS','Washington Commanders','WAS');

-- Seed current NFL season, week, and example games

-- Create 2025 NFL season
insert into seasons (league, year)
values ('NFL', 2025)
on conflict (league, year) do nothing;

-- Grab the season_id
with s as (
  select id from seasons where league = 'NFL' and year = 2025
)
insert into weeks (season_id, week_number, start_ts, end_ts, is_active)
select s.id, 1, '2025-09-04 00:00:00+00', '2025-09-10 00:00:00+00', true
from s
on conflict (season_id, week_number) do nothing;

-- Insert a couple of example games for Week 1
with w as (
  select id as week_id from weeks
  where week_number = 1
    and season_id = (select id from seasons where league = 'NFL' and year = 2025)
)
insert into games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status)
select
  w.week_id,
  'espn-401547405',  -- dummy ESPN ID (swap for real when syncing)
  '2025-09-04 00:20:00+00'::timestamptz,
  (select id from teams where short_name='KC'),
  (select id from teams where short_name='BUF'),
  'scheduled'
from w
union all
select
  w.week_id,
  'espn-401547406',
  '2025-09-07 17:00:00+00'::timestamptz,
  (select id from teams where short_name='PHI'),
  (select id from teams where short_name='DAL'),
  'scheduled'
from w;

-- Seed example betting lines for Week 1 dummy games

-- Chiefs (-3.5) vs Bills
insert into game_lines (game_id, source, spread_team_id, spread_value, fetched_at, is_active_line)
select
  g.id,
  'barstool',
  (select id from teams where short_name = 'KC'),
  -3.5,
  now(),
  true
from games g
join weeks w on g.week_id = w.id
join seasons s on w.season_id = s.id
where s.year = 2025
  and w.week_number = 1
  and g.home_team_id = (select id from teams where short_name='KC')
  and g.away_team_id = (select id from teams where short_name='BUF')
on conflict do nothing;

-- Eagles (-2.5) vs Cowboys
insert into game_lines (game_id, source, spread_team_id, spread_value, fetched_at, is_active_line)
select
  g.id,
  'barstool',
  (select id from teams where short_name = 'PHI'),
  -2.5,
  now(),
  true
from games g
join weeks w on g.week_id = w.id
join seasons s on w.season_id = s.id
where s.year = 2025
  and w.week_number = 1
  and g.home_team_id = (select id from teams where short_name='PHI')
  and g.away_team_id = (select id from teams where short_name='DAL')
on conflict do nothing;



create or replace view public.ui_games as
select
  g.id                as id,
  g.week_id,
  g.commence_time     as kickoff,
  g.home_team_id,
  g.away_team_id,
  th.short_name       as home,
  ta.short_name       as away,
  gl.spread_value     as spread_value,        -- positive; 0 => PK; null => no line
  gl.spread_team_id   as favorite_team_id     -- UUID of favored team
from public.games g
left join public.game_lines gl on gl.game_id = g.id and gl.is_active_line = true
join public.teams th on th.id = g.home_team_id
join public.teams ta on ta.id = g.away_team_id;
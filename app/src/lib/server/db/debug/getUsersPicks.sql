-- Get all picks for a given user, including user name, team, week, season
-- Bind :user_id (uuid)
select
  u.display_name                         as user_name,
  s.year                                 as season,
  w.week_number                          as week,
  t.short_name                           as team_short,
  t.name                                 as team_name,
  p.weight                               as weight_code,
  case p.weight
    when 'A' then 'Ace'
    when 'H' then 'High'
    when 'M' then 'Medium'
    when 'L' then 'Low'
  end                                     as weight_label,
  g.commence_time                         as kickoff_utc,
  g.id                                    as game_id
from public.picks p
join public.users   u on u.id = p.user_id
join public.games   g on g.id = p.game_id
join public.weeks   w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.teams   t on t.id = p.picked_team_id
order by s.year desc, w.week_number asc, g.commence_time asc;

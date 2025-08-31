create or replace view public.picks_view as
select
  p.game_id,
  p.user_id,
  u.display_name,
  p.weight,
  case
    when p.picked_team_id = g.home_team_id then 'home'
    when p.picked_team_id = g.away_team_id then 'away'
  end as picked_side,
  t.short_name as picked_team,
  p.final_locked_at
from public.picks p
join public.users u on u.id = p.user_id
join public.games g on g.id = p.game_id
join public.teams t on t.id = p.picked_team_id;

-- Grant access to authenticated users
grant select on public.picks_view to authenticated;

-- Down migration (optional)
-- drop view if exists public.picks_view;

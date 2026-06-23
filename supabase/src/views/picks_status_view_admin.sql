create or replace view public.picks_status_view_admin
with (security_invoker = on) as
select
  p.game_id,
  g.week_id,
  p.user_id,
  u.display_name as user_display_name,
  p.weight,
  (case
     when p.picked_team_id = g.home_team_id then 'home'
     when p.picked_team_id = g.away_team_id then 'away'
   end)::public.side_enum as picked_side,
  p.picked_team_id,
  t.short_name as picked_team_short,
  p.locked_spread_value as locked_spread_value,
  p.locked_spread_team_id as locked_spread_team_id,
  p.locked_at,
  g.commence_time,
  (g.commence_time <= now()) as game_started,
  p.group_id
from public.picks p
join public.users u  on u.id = p.user_id
join public.games g  on g.id = p.game_id
join public.teams t  on t.id = p.picked_team_id;

revoke all on public.picks_status_view_admin from public;
grant select on public.picks_status_view_admin to service_role;

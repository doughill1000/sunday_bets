create or replace view public.picks_status_view_user as
select
  p.game_id,
  g.week_id,                       -- helpful for filtering by week
  p.user_id,
  p.weight,
  (case
     when p.picked_team_id = g.home_team_id then 'home'
     when p.picked_team_id = g.away_team_id then 'away'
   end)::public.side_enum as picked_side,
  p.picked_team_id,
  t.short_name as picked_team_short,
  p.final_locked_spread_value as locked_spread_value,
  p.final_locked_spread_team_id as locked_spread_team_id,
  p.initial_locked_at,
  p.final_locked_at,
  (p.final_locked_at is not null) as is_final_locked,
  g.commence_time,
  (g.commence_time <= now()) as game_started,
  p.relock_used,
  (not p.relock_used) as has_relock_available,
  (
    not p.relock_used
    and p.initial_locked_at is not null
    and g.commence_time > now()
  ) as can_relock_now
from public.picks p
join public.games g on g.id = p.game_id
join public.teams t on t.id = p.picked_team_id;

-- Only grant this to authenticated (RLS will enforce visibility)
revoke all on public.picks_status_view_user from public;
grant select on public.picks_status_view_user to authenticated;

-- Create a service/admin view that includes user info for server-side reporting
create or replace view public.picks_status_view_admin as
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
  p.final_locked_spread_value as locked_spread_value,
  p.final_locked_spread_team_id as locked_spread_team_id,
  p.initial_locked_at,
  p.final_locked_at,
  (p.final_locked_at is not null) as is_final_locked,
  g.commence_time,
  (g.commence_time <= now()) as game_started,
  p.relock_used,
  (not p.relock_used) as has_relock_available,
  (
    not p.relock_used
    and p.initial_locked_at is not null
    and g.commence_time > now()
  ) as can_relock_now
from public.picks p
join public.users u  on u.id = p.user_id
join public.games g  on g.id = p.game_id
join public.teams t  on t.id = p.picked_team_id;

-- Grant select only to service_role (server-only)
revoke all on public.picks_status_view_admin from public;
grant select on public.picks_status_view_admin to service_role;
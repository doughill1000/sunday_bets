-- Optional: tighten "picked_side" as an enum for cleaner downstream types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'side_enum') then
    create type public.side_enum as enum ('home', 'away');
  end if;
end$$;

create or replace view public.picks_status_view as
select
  -- identity / joins
  p.game_id,
  p.user_id,
  u.display_name as user_display_name,

  -- pick + team details
  p.weight,                             -- public.weight_enum
  case
    when p.picked_team_id = g.home_team_id then 'home'
    when p.picked_team_id = g.away_team_id then 'away'
  end::public.side_enum as picked_side,
  p.picked_team_id,                     -- INT for stronger TS typing
  t.short_name as picked_team_short,

  -- lock lifecycle
  p.initial_locked_at,
  p.final_locked_at,
  (p.final_locked_at is not null) as is_final_locked,

  -- game timing
  g.commence_time,
  (g.commence_time <= now()) as game_started,

  -- relock signals
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

grant select on public.picks_status_view to authenticated;

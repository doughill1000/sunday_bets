create or replace function public.ats_margin_at_lock(
  home_pts int,
  away_pts int,
  home_id uuid,
  away_id uuid,
  spread_team_id uuid,
  spread_value numeric
) returns numeric
language sql
immutable
as $$
  select (home_pts - away_pts)
       + case
           when spread_team_id = home_id then spread_value
           when spread_team_id = away_id then -spread_value
           else 0
         end
$$;
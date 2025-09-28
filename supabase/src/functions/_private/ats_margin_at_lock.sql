create or replace function public.ats_margin_at_lock(
  home_pts int,
  away_pts int,
  home_id  int,
  away_id  int,
  spread_team_id int,
  spread_value numeric
) returns numeric
language sql
immutable
as $$
  select (home_pts - away_pts)
       + case
           when spread_team_id = home_id then -abs(spread_value)
           when spread_team_id = away_id then  abs(spread_value)
           else 0
         end
$$;

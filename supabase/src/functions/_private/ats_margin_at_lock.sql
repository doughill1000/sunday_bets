create or replace function public.ats_margin_at_lock(
  home_pts int,
  away_pts int,
  home_id  int,
  away_id  int,
  spread_team_id int,  -- the favorite
  spread_value numeric -- positive magnitude of the line (e.g. 2.5)
) returns numeric
language sql
immutable
as $$
  -- Positive result means HOME covered ATS; negative means AWAY covered; 0 = push
  select (home_pts - away_pts)
       + case
           when spread_team_id = home_id then -spread_value  -- home favorite: subtract handicap
           when spread_team_id = away_id then  spread_value  -- away favorite: give home the points
           else 0
         end
$$;

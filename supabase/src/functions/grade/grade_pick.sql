create or replace function public.grade_pick(
  home_pts int,
  away_pts int,
  home_id int,
  away_id int,
  picked_team_id int,
  spread_team_id int,
  spread_value numeric,
  weight text
) returns table(points_delta int, outcome public.pick_outcome)
language sql immutable
as $$
  with m as (
    select public.ats_margin_at_lock(home_pts, away_pts, home_id, away_id, spread_team_id, spread_value) as margin,
           public.weight_points(weight) as points_value
  )
  select
    case
      when margin = 0 then 0
      when (margin > 0 and picked_team_id = home_id)
        or (margin < 0 and picked_team_id = away_id)
        then points_value
      else -points_value
    end as points_delta,
    case
      when margin = 0 then 'push'::public.pick_outcome
      when (margin > 0 and picked_team_id = home_id)
        or (margin < 0 and picked_team_id = away_id)
        then 'win'::public.pick_outcome
      else 'loss'::public.pick_outcome
    end as outcome
  from m;
$$;

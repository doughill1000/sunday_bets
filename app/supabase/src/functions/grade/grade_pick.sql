create or replace function public.grade_pick(
  home_pts int,
  away_pts int,
  home_id uuid,
  away_id uuid,
  picked_team_id uuid,
  spread_team_id uuid,
  spread_value numeric,
  weight text
) returns table(points_delta int, outcome public.pick_outcome)
language sql
immutable
as $$
  with m as (
    select public.ats_margin_at_lock(home_pts, away_pts, home_id, away_id, spread_team_id, spread_value) as margin,
           public.weight_points(weight) as w
  )
  select
    case
      when margin = 0 then 0
      when margin > 0 then case when picked_team_id = home_id then w else -w end
      else                    case when picked_team_id = away_id then w else -w end
    end as points_delta,
    case
      when margin = 0 then 'push'::public.pick_outcome
      when margin > 0 then case when picked_team_id = home_id then 'win'::public.pick_outcome else 'loss'::public.pick_outcome end
      else                    case when picked_team_id = away_id then 'win'::public.pick_outcome else 'loss'::public.pick_outcome end
    end as outcome
  from m
$$;

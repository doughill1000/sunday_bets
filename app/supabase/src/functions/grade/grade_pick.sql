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
language sql
immutable
as $$
  with result as (
    select
      public.ats_margin_at_lock(
        home_pts, away_pts, home_id, away_id, spread_team_id, spread_value
      ) as margin,
      public.weight_points(weight) as points_value
  ),
  outcome_calc as (
    select
      (select margin from result) as margin,
      (select points_value from result) as points_value,
      case
        when (select margin from result) = 0 then 'push'
        when ((select margin from result) > 0 and picked_team_id = home_id)
          or ((select margin from result) < 0 and picked_team_id = away_id)
        then 'win'
        else 'loss'
      end::public.pick_outcome as final_outcome
  )
  select
    case
      when final_outcome = 'win' then points_value
      when final_outcome = 'loss' then -points_value
      else 0 -- push
    end as points_delta,
    final_outcome as outcome
  from outcome_calc;
$$;
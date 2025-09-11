create or replace function public.grade_season(p_season_id int)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.pick_settlement (pick_id, game_id, points_delta, outcome, graded_at)
  select
    p.id,
    g.id,
    gp.points_delta,
    gp.outcome,
    now()
  from public.weeks   w
  join public.games   g on g.week_id = w.id
  join public.picks   p on p.game_id = g.id
  -- only grade games that actually have final scores
  where w.season_id = p_season_id
    and (g.final_scores->>'home') is not null
    and (g.final_scores->>'away') is not null
  cross join lateral public.grade_pick(
    (g.final_scores->>'home')::int,
    (g.final_scores->>'away')::int,
    g.home_team_id,
    g.away_team_id,
    p.picked_team_id,
    p.spread_team_id_at_lock,
    p.spread_value_at_lock,
    p.weight
  ) as gp
  on conflict (pick_id)
  do update set
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;
end;
$$;

create or replace function public.grade_season(p_season_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (1) Real picks on final games
  insert into public.pick_settlement (user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    p.user_id,
    g.id,
    p.id,
    gp.points_delta,
    gp.outcome,
    now()
  from public.weeks   w
  join public.games   g on g.week_id = w.id
  join public.picks   p on p.game_id = g.id
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
  where w.season_id = p_season_id
    and (g.final_scores->>'home') is not null
    and (g.final_scores->>'away') is not null
  on conflict (user_id, game_id)
  do update set
    pick_id      = excluded.pick_id,
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

  -- (2) Penalties for missed picks on final games
  insert into public.pick_settlement (user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    u.id,
    g.id,
    null,
    coalesce(w.missed_pick_penalty, s.missed_pick_penalty, st.missed_pick_penalty, -1) as penalty,
    'missed'::public.pick_outcome,
    now()
  from public.weeks   w
  join public.games   g on g.week_id = w.id
  cross join (select id from public.users where role = 'player') u
  left join public.picks p on p.game_id = g.id and p.user_id = u.id
  join public.seasons s on s.id = w.season_id
  cross join public.settings st
  where w.season_id = p_season_id
    and (g.final_scores->>'home') is not null
    and (g.final_scores->>'away') is not null
    and p.id is null
  on conflict (user_id, game_id)
  do update set
    pick_id      = case when pick_settlement.pick_id is null then excluded.pick_id else pick_settlement.pick_id end,
    points_delta = case when pick_settlement.pick_id is null then excluded.points_delta else pick_settlement.points_delta end,
    outcome      = case when pick_settlement.pick_id is null then excluded.outcome else pick_settlement.outcome end,
    graded_at    = case when pick_settlement.pick_id is null then excluded.graded_at else pick_settlement.graded_at end;
end;
$$;
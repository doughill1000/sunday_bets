create or replace function public.grade_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  home_pts int; away_pts int; home_id int; away_id int;
  v_penalty int;
begin
  select (final_scores->>'home')::int,
         (final_scores->>'away')::int,
         home_team_id, away_team_id
  into   home_pts, away_pts, home_id, away_id
  from public.games
  where id = p_game_id;

  if home_pts is null or away_pts is null then
    raise exception 'grade_game: game % has no final scores', p_game_id;
  end if;

  -- pull the penalty from settings (via your resolver)
  v_penalty := public.resolve_missed_penalty_for_game(p_game_id);

  -- (1) Upsert settlements for users who DID make a pick
  insert into public.pick_settlement (user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    p.user_id,
    p.game_id,
    p.id,
    gp.points_delta,
    gp.outcome,
    now()
  from public.picks p
  cross join lateral public.grade_pick(
    home_pts, away_pts, home_id, away_id,
    p.picked_team_id,
    p.locked_spread_team_id,
    p.locked_spread_value,
    p.weight::text               -- enum -> text to match grade_pick signature
  ) as gp
  where p.game_id = p_game_id
  on conflict (user_id, game_id)
  do update set
    pick_id      = excluded.pick_id,
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

  -- (2) Penalty rows for users with NO pick on this game (settings-driven)
  insert into public.pick_settlement (user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    u.id,
    p_game_id,
    null,
    v_penalty,
    'missed'::public.pick_outcome,
    now()
  from public.users u
  where u.role = 'player'
    and not exists (
      select 1 from public.picks p where p.game_id = p_game_id and p.user_id = u.id
    )
  on conflict (user_id, game_id)
  do update set
    -- only overwrite if there still isn't a pick
    pick_id      = case when pick_settlement.pick_id is null then excluded.pick_id else pick_settlement.pick_id end,
    points_delta = case when pick_settlement.pick_id is null then excluded.points_delta else pick_settlement.points_delta end,
    outcome      = case when pick_settlement.pick_id is null then excluded.outcome else pick_settlement.outcome end,
    graded_at    = case when pick_settlement.pick_id is null then excluded.graded_at else pick_settlement.graded_at end;
end;
$$;

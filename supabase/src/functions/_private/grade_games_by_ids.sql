-- This is a new internal helper function. Note the leading underscore.
create or replace function public._grade_games_by_ids(p_game_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (1) Upsert settlements for users who DID make a pick on the given games
  insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    p.group_id,
    p.user_id,
    g.id,
    p.id,
    gp.points_delta,
    gp.outcome,
    now()
  from public.games g
  join public.picks p on p.game_id = g.id
  cross join lateral public.grade_pick(
    (g.final_scores->>'home')::int,
    (g.final_scores->>'away')::int,
    g.home_team_id,
    g.away_team_id,
    p.picked_team_id,
    p.locked_spread_team_id,
    p.locked_spread_value,
    p.weight::text
  ) as gp
  where g.id = any(p_game_ids)
  on conflict (group_id, user_id, game_id)
  do update set
    pick_id      = excluded.pick_id,
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

  -- (2) Upsert "missed" penalties for users who did NOT make a pick
  insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
  select
    gm.group_id,
    u.id,
    g.id,
    null,
    public.resolve_missed_penalty_for_game(g.id),
    'missed'::public.pick_outcome,
    now()
  from public.games g
  cross join public.group_memberships gm
  join public.users u on u.id = gm.user_id and u.role = 'player'
  where g.id = any(p_game_ids)
    and not exists (
      select 1
      from public.picks p
      where p.group_id = gm.group_id
        and p.game_id = g.id
        and p.user_id = u.id
    )
  on conflict (group_id, user_id, game_id)
  do update set
    -- Only update if the existing settlement is also for a missed pick.
    -- This prevents overwriting a real pick that was graded out of order.
    pick_id      = excluded.pick_id,
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at
  where pick_settlement.pick_id is null;
end;
$$;

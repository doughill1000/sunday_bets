create or replace function public.grade_game(p_game_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  home_pts int; away_pts int; home_id uuid; away_id uuid;
begin
  select (final_scores->>'home')::int,
         (final_scores->>'away')::int,
         home_team_id, away_team_id
  into   home_pts, away_pts, home_id, away_id
  from public.games
  where id = p_game_id;

  insert into public.pick_settlement (pick_id, game_id, points_delta, outcome, graded_at)
  select
    p.id,
    p.game_id,
    gp.points_delta,
    gp.outcome,
    now()
  from public.picks p
  cross join lateral public.grade_pick(
    home_pts, away_pts, home_id, away_id,
    p.picked_team_id, p.spread_team_id_at_lock, p.spread_value_at_lock, p.weight
  ) as gp
  where p.game_id = p_game_id
  on conflict (pick_id)
  do update set points_delta = excluded.points_delta,
                outcome      = excluded.outcome,
                graded_at    = excluded.graded_at;
end;
$$;

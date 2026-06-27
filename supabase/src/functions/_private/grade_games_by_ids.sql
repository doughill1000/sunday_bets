-- This is a new internal helper function. Note the leading underscore.
create or replace function public._grade_games_by_ids(p_game_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Capture the closing line for each game before grading (write-once).
  perform public._capture_closing_line(p_game_ids);

  -- (1) Upsert settlements for users who DID make a pick on the given games.
  -- Effective preset = coalesce(prior graded_preset, group config, 'gamer'), frozen at
  -- first grade so re-grades never flip an already-settled week to a different preset.
  insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset)
  select
    p.group_id,
    p.user_id,
    g.id,
    p.id,
    gp.points_delta,
    gp.outcome,
    now(),
    eff.preset
  from public.games g
  join public.picks p on p.game_id = g.id
  left join public.group_config cfg on cfg.group_id = p.group_id
  left join public.pick_settlement ps_prior
    on ps_prior.group_id = p.group_id
   and ps_prior.user_id  = p.user_id
   and ps_prior.game_id  = g.id
  left join lateral (
    select gl.spread_team_id, gl.spread_value
    from public.game_lines gl
    where gl.game_id = g.id
      and gl.source  = coalesce(cfg.line_source, 'fanduel')
      and gl.is_closing_line
    limit 1
  ) cl on true
  cross join lateral (
    select coalesce(ps_prior.graded_preset, cfg.grading_preset, 'gamer') as preset
  ) eff
  cross join lateral public.grade_pick(
    (g.final_scores->>'home')::int,
    (g.final_scores->>'away')::int,
    g.home_team_id,
    g.away_team_id,
    p.picked_team_id,
    case when eff.preset = 'house'
         then coalesce(cl.spread_team_id, p.locked_spread_team_id)
         else p.locked_spread_team_id end,
    case when eff.preset = 'house'
         then coalesce(cl.spread_value, p.locked_spread_value)
         else p.locked_spread_value end,
    p.weight::text
  ) as gp
  where g.id = any(p_game_ids)
  on conflict (group_id, user_id, game_id)
  do update set
    pick_id      = excluded.pick_id,
    points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at,
    graded_preset = excluded.graded_preset;

  -- (2) Upsert "missed" penalties for users who did NOT make a pick.
  -- Line is irrelevant for missed picks; graded_preset is set for consistency.
  insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset)
  select
    gm.group_id,
    u.id,
    g.id,
    null,
    public.resolve_missed_penalty_for_game(g.id),
    'missed'::public.pick_outcome,
    now(),
    coalesce(ps_prior.graded_preset, cfg.grading_preset, 'gamer')
  from public.games g
  cross join public.group_memberships gm
  join public.users u on u.id = gm.user_id and u.role = 'player'
  left join public.group_config cfg on cfg.group_id = gm.group_id
  left join public.pick_settlement ps_prior
    on ps_prior.group_id = gm.group_id
   and ps_prior.user_id  = u.id
   and ps_prior.game_id  = g.id
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
    pick_id       = excluded.pick_id,
    points_delta  = excluded.points_delta,
    outcome       = excluded.outcome,
    graded_at     = excluded.graded_at,
    graded_preset = excluded.graded_preset
  where pick_settlement.pick_id is null;
end;
$$;

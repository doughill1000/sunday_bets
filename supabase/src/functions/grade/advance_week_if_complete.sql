create or replace function public.advance_week_if_complete()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week                  record;
  v_total_games            int;
  v_final_games            int;
  v_unsettled_final_games  int;
begin
  select id, week_number into v_week
  from public.weeks
  where end_ts < now()
  order by end_ts desc
  limit 1;

  if v_week is null then
    return jsonb_build_object('ok', true, 'reason', 'no_concluded_week');
  end if;

  select
    count(*) filter (where status != 'postponed'),
    count(*) filter (where status != 'postponed' and (final_scores->>'home') is not null)
  into v_total_games, v_final_games
  from public.games
  where week_id = v_week.id;

  -- Completeness = every final game has been graded, i.e. has at least one
  -- pick_settlement row. Mirrors find_unsettled_weeks' predicate. Deliberately
  -- NOT a count comparison against public.picks: pick_settlement also carries
  -- synthetic "missed" rows for every active member who didn't pick a game (see
  -- _grade_games_by_ids), so settled rows almost always outnumber real picks
  -- and a raw count-equality check can never be satisfied once anyone misses.
  --
  -- _settlement_owed() carries the boundary half of that mirror (ADR-0037, #724): under the
  -- participation boundary a game can legitimately owe zero rows (a league created after it
  -- was played), and without this guard such a week could never report complete -- which
  -- would strand the grade cron's #744 settled-prior-week gate on it forever.
  select count(*) into v_unsettled_final_games
  from public.games g
  where g.week_id = v_week.id
    and g.status != 'postponed'
    and (g.final_scores->>'home') is not null
    and public._settlement_owed(g.id)
    and not exists (
      select 1 from public.pick_settlement ps where ps.game_id = g.id
    );

  return jsonb_build_object(
    'ok',                     v_final_games = v_total_games and v_unsettled_final_games = 0,
    'week_id',                v_week.id,
    'week_number',            v_week.week_number,
    'total_games',            v_total_games,
    'final_games',            v_final_games,
    'unsettled_final_games',  v_unsettled_final_games
  );
end;
$$;

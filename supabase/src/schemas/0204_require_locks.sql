-- Unstarted: use current active
update public.picks p
set locked_at = coalesce(p.locked_at, now()),
    locked_line_id = gl.id,
    locked_spread_team_id = gl.spread_team_id,
    locked_spread_value = gl.spread_value
from public.game_lines gl
join public.games g
  on g.id = gl.game_id
where p.game_id = gl.game_id
  and gl.is_active_line = true
  and now() < g.commence_time
  and (
    p.locked_line_id is null
    or p.locked_spread_team_id is null
    or p.locked_spread_value is null
  );

-- Started: use last line at/before kickoff (one per game via LATERAL)
update public.picks p
set locked_at = coalesce(p.locked_at, g.commence_time),
    locked_line_id = c.id,
    locked_spread_team_id = c.spread_team_id,
    locked_spread_value = c.spread_value
from public.games g
join lateral (
  select gl.*
  from public.game_lines gl
  where gl.game_id = g.id
    and gl.fetched_at <= g.commence_time
  order by gl.fetched_at desc, gl.id desc
  limit 1
) c on true
where p.game_id = g.id
  and now() >= g.commence_time
  and (
    p.locked_line_id is null
    or p.locked_spread_team_id is null
    or p.locked_spread_value is null
  );

-- Only make these NOT NULL after the backfill above succeeds
alter table public.picks
  alter column locked_at             set not null,
  alter column locked_spread_team_id set not null,
  alter column locked_spread_value   set not null;

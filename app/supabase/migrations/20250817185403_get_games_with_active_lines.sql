create or replace function public.get_games_with_active_lines(p_week_id bigint)
returns table (
  game_id uuid,
  external_game_id text,
  kickoff timestamptz,
  home_code text,
  home_name text,
  away_code text,
  away_name text,
  spread_team text,      -- 'home' | 'away'
  spread_value numeric,
  line_source text
)
language sql
stable
as $$
  select
    g.id                              as game_id,
    g.external_game_id::text          as external_game_id,
    g.commence_time                   as kickoff,
    th.short_name                     as home_code,
    th.name                           as home_name,
    ta.short_name                     as away_code,
    ta.name                           as away_name,
    case
      when gl.spread_team_id = g.home_team_id then 'home'
      else 'away'
    end                                as spread_team,
    gl.spread_value                    as spread_value,
    gl.source                          as line_source
  from public.games g
  join public.teams th on th.id = g.home_team_id
  join public.teams ta on ta.id = g.away_team_id
  join public.game_lines gl
    on gl.game_id = g.id
   and gl.is_active_line = true
  where g.week_id = p_week_id
  order by g.commence_time asc;
$$;
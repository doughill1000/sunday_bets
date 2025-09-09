alter table public.seasons
  add constraint ux_seasons_league_year unique (league, year);

alter table public.weeks
  add constraint ux_weeks_season_week unique (season_id, week_number);

-- uq_game_lines_game_source 
with ranked as (
  select id,
         row_number() over (partition by game_id, source order by fetched_at desc, id desc) as rn
  from public.game_lines
)
delete from public.game_lines gl
using ranked r
where gl.id = r.id and r.rn > 1;

-- Now enforce uniqueness for UPSERT
alter table public.game_lines
  add constraint uq_game_lines_game_source unique (game_id, source);
alter table public.seasons
  add constraint ux_seasons_league_year unique (league, year);

alter table public.weeks
  add constraint ux_weeks_season_week unique (season_id, week_number);

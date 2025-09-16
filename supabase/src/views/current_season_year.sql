create or replace view public.current_season_year as
select max(year)::int as season_year from public.seasons;

create index if not exists idx_ps_game on public.pick_settlement (game_id);
create index if not exists idx_ps_user on public.pick_settlement (user_id);
create index if not exists idx_games_week on public.games (week_id);
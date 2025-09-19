alter table public.games
  add constraint uq_games_external unique (external_game_id);

  -- TEAMS: de-dupe by name, then add UNIQUE(name)
with ranked as (
  select id, name,
         row_number() over (partition by name order by id desc) rn
  from public.teams
)
delete from public.teams t
using ranked r
where t.id = r.id and r.rn > 1;

alter table public.teams
  add constraint uq_teams_name unique (name);

-- SEASONS: better uniqueness is (league, year) instead of just year
with ranked as (
  select id, league, year,
         row_number() over (partition by league, year order by id desc) rn
  from public.seasons
)
delete from public.seasons s
using ranked r
where s.id = r.id and r.rn > 1;

alter table public.seasons
  add constraint uq_seasons_league_year unique (league, year);

-- Drop legacy names if they exist (safe no-ops otherwise)
DROP INDEX IF EXISTS ux_game_lines_active_per_source;
DROP INDEX IF EXISTS game_lines_active_unique;

-- Create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS ux_game_lines_active_per_source
ON public.game_lines (game_id, source)
WHERE is_active_line = true;

-- Optional hardening (run once):
-- Ensure is_active_line is always set (and false by default), so the partial index behaves predictably.
ALTER TABLE public.game_lines
  ALTER COLUMN is_active_line SET DEFAULT false,
  ALTER COLUMN is_active_line SET NOT NULL;

-- 1) Remove duplicates so the constraint can be created
WITH ranked AS (
  SELECT id, season_id, week_number,
         row_number() OVER (
           PARTITION BY season_id, week_number
           ORDER BY id DESC
         ) AS rn
  FROM public.weeks
)
DELETE FROM public.weeks w
USING ranked r
WHERE w.id = r.id
  AND r.rn > 1;

ALTER TABLE public.weeks
  DROP CONSTRAINT IF EXISTS ux_weeks_season_week;

ALTER TABLE public.weeks
  ADD CONSTRAINT ux_weeks_season_week
  UNIQUE (season_id, week_number);
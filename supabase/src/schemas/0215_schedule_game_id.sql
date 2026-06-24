-- Add ESPN event id as an observability/re-sync attribute (not an identity key).
alter table public.games
  add column if not exists schedule_game_id text;

-- Defensively remove any duplicate matchups before adding the constraint.
-- In practice the Odds API enforces uniqueness, but the migration must be safe.
with ranked as (
  select id,
         row_number() over (
           partition by week_id, home_team_id, away_team_id
           order by
             (external_game_id is null)::int, -- keep rows that already have an Odds id
             id asc
         ) as rn
  from public.games
)
delete from public.games g
using ranked r
where g.id = r.id
  and r.rn > 1;

-- The durable identity of a game is its matchup within a week.
-- Provider ids (external_game_id, schedule_game_id) are attributes, not the key.
alter table public.games
  add constraint uq_games_matchup unique (week_id, home_team_id, away_team_id);

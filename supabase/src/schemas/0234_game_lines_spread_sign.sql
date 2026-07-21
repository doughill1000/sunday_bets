-- Make the canonical line convention enforceable rather than conventional (#734).
--
-- The convention (ADR-0007, documented on the table in 0200_05_game_lines.sql):
--   game_lines.spread_team_id IS THE FAVORITE, and
--   game_lines.spread_value   is a NON-NEGATIVE MAGNITUDE (0 = pick'em).
--
-- public.set_active_line already normalizes to that form on every write, but nothing stopped
-- a direct insert -- a backfill, a historical import, or a pgTAP fixture -- from storing the
-- older "negative = favorite" form. That gap is not hypothetical: the column's own comment
-- said "negative = favorite" until #734, two read models believed it and tested
-- `spread_value < 0`, and because real data is never negative that test labelled the underdog
-- as the favorite on every row. The pgTAP fixtures had encoded the negative form since #406,
-- so the suite stayed green while every fav/dog surface in the app was inverted. A constraint
-- is what makes the fixtures and the read models disagree loudly instead of silently.
--
-- `>= 0`, not `> 0`: zero is a legitimate pick'em, which league_ats_base reads as
-- is_favorite = NULL and league_ats_spread_buckets buckets at 0. Prod carries two such rows.
-- set_active_line rejects a zero INPUT, so pick'ems only ever arrive by direct import.
--
-- Verified before adding: prod (anzcshrpfpxajcgrwczv) held 1309 positive, 2 zero and zero
-- negative rows, so this validates against existing data with no backfill.
--
-- Stated as an alter, and in its own source file, for two reasons: the table's defining
-- statement in 0200_05_game_lines.sql is IF NOT EXISTS guarded and therefore a no-op on an
-- existing database (a column-inline check would never reach prod), and the migration
-- generator permits only one primary object per source file.
alter table public.game_lines
  drop constraint if exists game_lines_spread_value_non_negative;
alter table public.game_lines
  add constraint game_lines_spread_value_non_negative check (spread_value >= 0);

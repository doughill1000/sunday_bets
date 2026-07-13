-- Flat, service-role-only input feed for the cross-season credibility rating fold (#361, ADR-0032).
--
-- One row per SETTLED SPREAD DECISION that counts toward the rating: a real pick (pick_id not null)
-- in a scoring round (ADR-0016) that settled win / loss / push. `missed` is excluded (ADR-0032 §3:
-- an absence the standings already punish, not a bad read), and non-scoring rounds are excluded.
-- The pure TS fold ($lib/server/rating) reads this, orders each player's rows by
-- (season_year, commence_time, game_id), folds, and rebuilds public.player_ratings.
--
-- NOT materialized: it is read only during the post-grade rebuild (a few times a week) and off
-- every hot path, so re-running the join each rebuild is cheap and avoids another matview to
-- refresh. Service-role-only, like the stats matviews (ADR-0013) — reads scope by group_id. No
-- security_invoker: no client ever selects it (only the service role, which bypasses RLS).
create or replace view public.player_rating_inputs as
select
  ps.group_id,
  ps.user_id,
  s.year         as season_year,
  g.commence_time,
  g.id           as game_id,
  p.weight,
  ps.outcome
from public.pick_settlement ps
join public.picks   p on p.id = ps.pick_id
join public.games   g on g.id = ps.game_id
join public.weeks   w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
where ps.pick_id is not null
  and ps.outcome in ('win', 'loss', 'push')
  and w.is_scoring;

-- Service-role only (matview-style read model, ADR-0013): strip the default anon/PUBLIC ACL
-- Supabase auto-grants on new views, then grant SELECT to service_role.
revoke all on public.player_rating_inputs from public, anon, authenticated;
grant select on public.player_rating_inputs to service_role;

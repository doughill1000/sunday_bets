-- Per-user opt-out for the pick-card ATS trend nugget (issue #406, PR 2). Default true so the
-- nugget shows for every existing and new user; the Settings toggle ("Show team trends on
-- picks") flips it. Rides the cached users profile (ADR-0014) alongside avatar_key /
-- guide_seen_at, so it is read in hooks.server.ts and busted on write in /api/profile.
alter table public.users
  add column if not exists show_team_trends boolean not null default true;

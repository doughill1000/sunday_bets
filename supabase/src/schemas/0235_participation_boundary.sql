-- Participation boundary (ADR-0037, #712/#722): a game counts for a member only if it
-- starts on or after BOTH the league's competition start and that member's join:
--
--   game.commence_time >= greatest(groups.competition_starts_at, group_memberships.joined_at)
--
-- Without it, the missed-pass in public._grade_games_by_ids enumerates every active member
-- with no pick and manufactures a penalty for every pre-participation game: a league created
-- in Week 10 accrues misses for Weeks 1-9, and a member added in Week 4 accrues misses for
-- Weeks 1-3. The latter is a live fairness defect, not a midseason-creation hypothetical.
--
-- '2000-01-01Z' below is the documented INCLUDE-ALL SENTINEL, not a real competition start.
-- It predates every NFL game this app stores, so it makes the groups/joined_at term drop out
-- of the greatest(). Read it only as "this row has no explicit start"; never compare against
-- it as if it were a date a league actually began.

-- ── Sentinel 1: groups.competition_starts_at (ADR-0037 ruling 1 + 3) ──────────────────────
--
-- Added nullable, backfilled, and only THEN given its now() default. A single
-- `add column ... not null default now()` would stamp every EXISTING row with the migration
-- instant, which is the same retroactivity bug in reverse: every already-graded game would
-- fall behind a boundary invented at deploy time. Order matters here.
alter table public.groups
  add column if not exists competition_starts_at timestamptz;

update public.groups
set competition_starts_at = '2000-01-01T00:00:00Z'
where competition_starts_at is null;

-- Ruling 5: a newly created league starts now(), so create_group needs no change to be safe
-- before the start-week picker (ADR-0037 follow-up "Issue C") ships.
alter table public.groups
  alter column competition_starts_at set default now();

alter table public.groups
  alter column competition_starts_at set not null;

-- ── Sentinel 2: legacy group_memberships.joined_at (extends ruling 3) ─────────────────────
--
-- Sentinelling only `groups` is insufficient against real data, so ruling 3 is applied to the
-- second term of the greatest() as well. Production's single league and all six of its
-- memberships carry joined_at = 2026-06-23 -- the instant those rows were created by an
-- earlier backfill, which post-dates the ENTIRE 2025 season they actually played. Left alone,
-- greatest('2000-01-01Z', '2026-06-23') = 2026-06-23 would make all 272 already-settled 2025
-- rows per member retroactively ineligible: precisely the outcome ruling 3 exists to prevent.
--
-- Targeted, not blanket: only a membership already settled for a game that PREDATES its own
-- joined_at is rewritten -- a self-evident contradiction, since you cannot have been graded
-- for a game played before you joined. A genuine late joiner (settled only for games after
-- their join) keeps their real joined_at, so the boundary still binds for them.
--
-- Deliberately NOT restricted to unlocked seasons: a member whose only history is an imported
-- grading_locked season (2022-24, ADR-0024) must be sentinelled too, or the boundary-aware
-- read surfaces of ADR-0037's follow-up would hide that imported history from them.
--
-- Idempotent: after one run the sentinel predates every game, so the predicate matches nothing.
update public.group_memberships gm
set joined_at = '2000-01-01T00:00:00Z'
where exists (
  select 1
  from public.pick_settlement ps
  join public.games g on g.id = ps.game_id
  where ps.group_id = gm.group_id
    and ps.user_id = gm.user_id
    and g.commence_time < gm.joined_at
);

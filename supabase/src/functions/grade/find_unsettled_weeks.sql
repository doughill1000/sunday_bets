-- Reconcile sweep (#433): find weeks that have final scores but were never settled.
--
-- The grade cron normally only processes the active + most-recently-concluded week
-- (findRecentGradableWeeks), so a week missed during that window is stranded forever
-- even once its finals are present. This function is the predicate the cron uses to
-- self-heal those weeks: it returns every week that has at least one game with a final
-- score for which NO pick_settlement row exists yet.
--
-- The predicate is deliberately "finals-present-but-unsettled", not merely
-- "finals-present": once a week is graded, every one of its final games has settlement
-- rows (real picks + membership-scoped missed penalties, see _grade_games_by_ids), so a
-- healthy already-settled week is NOT returned. That makes the sweep a true no-op on
-- every tick after the week heals, instead of re-firing on every graded week.
--
-- Frozen (grading_locked, ADR-0024) seasons are excluded: their settlements come from
-- the sheet import and are never re-derived, and _grade_games_by_ids is a no-op on them,
-- so a locked-season game with finals-but-no-settlement (e.g. a canceled game) could
-- never be healed and would re-fire forever. Excluding them here keeps the sweep
-- idempotent.
--
-- SECURITY DEFINER + service-role-only (like the grade_* functions): this reads across
-- all groups' pick_settlement rows and is only ever called by the grade cron.
create or replace function public.find_unsettled_weeks()
returns table(id int)
language sql
security definer
stable
set search_path = public
as $$
  select distinct w.id
  from public.weeks w
  join public.seasons s on s.id = w.season_id
  join public.games g on g.week_id = w.id
  where not s.grading_locked
    and (g.final_scores->>'home') is not null
    and not exists (
      select 1
      from public.pick_settlement ps
      where ps.game_id = g.id
    );
$$;

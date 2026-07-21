-- _settlement_owed: does grading owe ANY pick_settlement row for this game?
--
-- The negative space of the participation boundary (ADR-0037, #724). The completeness
-- surfaces -- find_unsettled_weeks() (#433) and advance_week_if_complete() (#658) -- both
-- define "unsettled" as "this game is final but has ZERO pick_settlement rows". That
-- predicate silently assumed grading always owes at least one row per game, which was true
-- before ADR-0037 bounded the missed-pass in time: every active member of every league was
-- penalizable for every game, so any final game acquired rows.
--
-- With the boundary in force a game can legitimately owe NOTHING: a league created in week
-- 10, or a league whose only members joined later, has no eligible (member, game) pair for
-- the earlier weeks. _grade_games_by_ids correctly writes no row for such a game -- so the
-- zero-row test flags it forever. The reconcile sweep would re-fire on every tick against a
-- week it can never heal, and advance_week_if_complete would never report that week complete
-- (which in turn keeps the grade cron's #744 settled-prior-week gate from ever releasing it).
--
-- So both callers gain this predicate: a final game is only "unsettled" if a row is actually
-- owed. Owed means either
--   (a) some ACTIVE membership anywhere is eligible for it -- the missed-pass population,
--       gated by the same public._participation_start the grading choke point uses; or
--   (b) a real pick exists on it -- pass (1) of _grade_games_by_ids grades real picks with
--       no boundary gate (ADR-0037 ruling 2), so a pick from a since-removed member still
--       produces a row and must still be swept for.
--
-- Deliberately group-agnostic: both callers are global (cross-league) and only ask whether
-- the GAME is stranded, not which league stranded it.
--
-- SECURITY DEFINER for the same reason as _participation_start: the answer is a grading fact
-- and must not vary with the caller's RLS view of group_memberships/picks. Born closed to
-- anon/authenticated by the _close_new_fn_acl event trigger (ADR-0011); internal helper,
-- never a client RPC.
create or replace function public._settlement_owed(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.games g
      cross join public.group_memberships gm
      where g.id = p_game_id
        and gm.status = 'active'
        and g.commence_time >= public._participation_start(gm.group_id, gm.user_id)
    )
    or exists (
      select 1
      from public.picks p
      where p.game_id = p_game_id
    );
$$;

comment on function public._settlement_owed(uuid) is
  'ADR-0037 / #724: true when grading owes at least one pick_settlement row for this game -- some active membership is eligible under _participation_start, or a real pick exists. The completeness surfaces (find_unsettled_weeks, advance_week_if_complete) use it so a game no league was participating in is not flagged as permanently unsettled.';

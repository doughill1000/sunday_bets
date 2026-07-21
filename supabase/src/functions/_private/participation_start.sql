-- _participation_start: the single definition of the ADR-0037 participation boundary.
--
-- Returns the instant from which a (group, member) pair is eligible to be settled. A game
-- counts for that member iff:
--
--   game.commence_time >= public._participation_start(group_id, user_id)
--
-- which is greatest(the league's competition start, that member's join). One function rather
-- than the same greatest(...) join copy-pasted into every caller: the grading choke point
-- (_grade_games_by_ids), the completeness guard (tests/055), and the membership x games read
-- surfaces audited in the follow-up issue all call this, so the rule changes in one place.
--
-- Returns NULL when the pair is not a membership at all (e.g. a removed member). Every
-- comparison against NULL is NULL, so such a row is excluded rather than silently treated as
-- eligible-from-forever -- the conservative direction for a boundary check.
--
-- SECURITY DEFINER on purpose: the boundary is a scoring fact, and a caller reading under RLS
-- must not be able to see a DIFFERENT boundary (or NULL) than grading used. Born closed to
-- anon/authenticated by the _close_new_fn_acl event trigger (schemas/0000_function_acl_guard.sql,
-- ADR-0011); it is an internal helper, never a client RPC.
create or replace function public._participation_start(p_group_id uuid, p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select greatest(g.competition_starts_at, gm.joined_at)
  from public.group_memberships gm
  join public.groups g on g.id = gm.group_id
  where gm.group_id = p_group_id
    and gm.user_id = p_user_id
$$;

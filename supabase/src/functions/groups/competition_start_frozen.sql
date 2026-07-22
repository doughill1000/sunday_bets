-- competition_start_frozen: the single ADR-0037 ruling-4 predicate — is a league's
-- competition start still editable, or has play already begun?
--
-- A league's competition_starts_at may be moved only until the FIRST game eligible under it
-- kicks off; thereafter it is permanently frozen, because moving the line once results are
-- settling would retroactively add or erase them. "Eligible" mirrors the grading boundary
-- (public._participation_start / _grade_games_by_ids): a game counts once
-- game.commence_time >= groups.competition_starts_at. So the start is frozen exactly when some
-- such game's kickoff has already passed:
--
--   exists game g:  g.commence_time >= groups.competition_starts_at  AND  g.commence_time <= now()
--
-- Compared against the same global public.games population grading uses, so the UI's
-- "you can still change this" state can never disagree with what set_competition_start enforces.
--
-- One function rather than the predicate copy-pasted into the writer RPC and the manage-page
-- read: set_competition_start gates on it, and the commissioner console reads it to show or hide
-- the control. SECURITY DEFINER so a member sees the same frozen state grading enforces,
-- regardless of their RLS view of games. Born closed to anon/authenticated by the
-- _close_new_fn_acl event trigger (ADR-0011); granted explicitly in grants/group_grants.sql.
create or replace function public.competition_start_frozen(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.groups grp
    join public.games g
      on g.commence_time >= grp.competition_starts_at
     and g.commence_time <= now()
    where grp.id = p_group_id
  );
$$;

revoke execute on function public.competition_start_frozen(uuid) from public, anon;

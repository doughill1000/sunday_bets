-- Picks: owner-only before kickoff for writes; reveal after kickoff for reads
-- Requires helper functions: public.game_has_started(uuid)

drop policy if exists sel_picks_owner_or_started on public.picks;
create policy sel_picks_owner_or_started
  on public.picks for select
  to authenticated
  using (
    public.is_member(group_id)
    and (user_id = (select auth.uid()) or public.game_has_started(game_id))
  );

drop policy if exists ins_picks_own_pre on public.picks;
create policy ins_picks_own_pre
  on public.picks for insert
  to authenticated
  with check (
    public.is_member(group_id)
    and user_id = (select auth.uid())
    and not public.game_has_started(game_id)
  );

drop policy if exists upd_picks_pre on public.picks;
create policy upd_picks_pre
  on public.picks for update
  to authenticated
  using (
    public.is_member(group_id)
    and user_id = (select auth.uid())
    and not public.game_has_started(game_id)
  )
  with check (
    public.is_member(group_id)
    and user_id = (select auth.uid())
    and not public.game_has_started(game_id)
  );

-- Delete own pre-kickoff picks (required for unlock_pick_all_groups SECURITY INVOKER).
-- Mirrors the update guard: member, own row, before kickoff only.
drop policy if exists del_picks_own_pre on public.picks;
create policy del_picks_own_pre
  on public.picks for delete
  to authenticated
  using (
    public.is_member(group_id)
    and user_id = (select auth.uid())
    and not public.game_has_started(game_id)
  );

-- Picks: owner-only before kickoff for writes; reveal after kickoff for reads
-- Requires helper functions: public.game_has_started(uuid)

drop policy if exists sel_picks_owner_or_started on public.picks;
create policy sel_picks_owner_or_started
  on public.picks for select
  to authenticated
  using (user_id = auth.uid() or public.game_has_started(game_id));

drop policy if exists ins_picks_own_pre on public.picks;
create policy ins_picks_own_pre
  on public.picks for insert
  to authenticated
  with check (user_id = auth.uid() and not public.game_has_started(game_id));

drop policy if exists upd_picks_pre on public.picks;
create policy upd_picks_pre
  on public.picks for update
  to authenticated
  using (user_id = auth.uid() and not public.game_has_started(game_id))
  with check (user_id = auth.uid() and not public.game_has_started(game_id));

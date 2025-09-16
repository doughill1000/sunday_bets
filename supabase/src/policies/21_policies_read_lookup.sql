-- Lookup tables readable to authenticated (teams, weeks, seasons)

drop policy if exists sel_weeks on public.weeks;
create policy sel_weeks
  on public.weeks for select
  to authenticated
  using (true);

drop policy if exists sel_seasons on public.seasons;
create policy sel_seasons
  on public.seasons for select
  to authenticated
  using (true);

drop policy if exists sel_teams on public.teams;
create policy sel_teams
  on public.teams for select
  to authenticated
  using (true);
